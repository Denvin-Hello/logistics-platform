import { randomUUID } from "node:crypto"
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024

const MIME_EXTENSIONS: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
}

export const ALLOWED_DOCUMENT_MIME_TYPES = Object.keys(MIME_EXTENSIONS)

export interface StoredFile {
  key: string
  fileName: string
  mimeType: string
  sizeBytes: number
}

type StorageMode = "local" | "s3"

function storageMode(): StorageMode {
  return process.env.COMPLIANCE_STORAGE === "s3" ? "s3" : "local"
}

function localRoot() {
  return path.resolve(process.env.COMPLIANCE_STORAGE_DIR || path.join(process.cwd(), ".uploads"))
}

function localPath(key: string) {
  const root = localRoot()
  const resolved = path.resolve(root, key)
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid storage key")
  }
  return resolved
}

function s3Client() {
  const region = process.env.S3_REGION
  const bucket = process.env.S3_BUCKET
  if (!region || !bucket) {
    throw new Error("S3 storage is selected but S3_REGION or S3_BUCKET is not configured.")
  }

  return new S3Client({
    region,
    ...(process.env.S3_ENDPOINT
      ? {
          endpoint: process.env.S3_ENDPOINT,
          forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
        }
      : {}),
    ...(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
      ? {
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
          },
        }
      : {}),
  })
}

function s3Bucket() {
  const bucket = process.env.S3_BUCKET
  if (!bucket) throw new Error("S3_BUCKET is not configured.")
  return bucket
}

export function validateComplianceFile(file: File) {
  if (file.size <= 0) return "Choose a file to upload."
  if (file.size > MAX_DOCUMENT_BYTES) return "The file must be 10 MB or smaller."
  if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type)) {
    return "Upload a PDF, JPG, PNG, or WEBP file."
  }
  return null
}

function matchesFileSignature(mimeType: string, bytes: Buffer): boolean {
  if (bytes.length < 12) return false
  switch (mimeType) {
    case "application/pdf":
      return bytes.subarray(0, 5).toString("latin1") === "%PDF-"
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    case "image/png":
      return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    case "image/webp":
      return bytes.subarray(0, 4).toString("latin1") === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP"
    default:
      return false
  }
}

export async function saveComplianceFile(file: File): Promise<StoredFile> {
  const validation = validateComplianceFile(file)
  if (validation) throw new Error(validation)

  const extension = MIME_EXTENSIONS[file.type]
  const key = `compliance/${randomUUID()}${extension}`
  const bytes = Buffer.from(await file.arrayBuffer())

  if (!matchesFileSignature(file.type, bytes)) {
    throw new Error("The file content does not match its type. Upload a PDF, JPG, PNG, or WEBP file.")
  }

  if (storageMode() === "s3") {
    await s3Client().send(
      new PutObjectCommand({
        Bucket: s3Bucket(),
        Key: key,
        Body: bytes,
        ContentType: file.type,
      }),
    )
  } else {
    const target = localPath(key)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, bytes)
  }

  return {
    key,
    fileName: path.basename(file.name || `document${extension}`),
    mimeType: file.type,
    sizeBytes: file.size,
  }
}

export async function readComplianceFile(key: string): Promise<Uint8Array> {
  if (storageMode() === "s3") {
    const response = await s3Client().send(
      new GetObjectCommand({
        Bucket: s3Bucket(),
        Key: key,
      }),
    )
    if (!response.Body) throw new Error("Stored file has no body.")
    return response.Body.transformToByteArray()
  }

  const buffer = await readFile(localPath(key))
  return new Uint8Array(buffer)
}

export async function deleteComplianceFile(key: string): Promise<void> {
  try {
    if (storageMode() === "s3") {
      await s3Client().send(
        new DeleteObjectCommand({
          Bucket: s3Bucket(),
          Key: key,
        }),
      )
      return
    }
    await unlink(localPath(key))
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? (error as { code?: string }).code : undefined
    if (code !== "ENOENT") {
      console.error("[storage] Failed to delete compliance file:", error)
    }
  }
}
