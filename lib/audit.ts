import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

interface AuditInput {
  actorId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  metadata?: Record<string, unknown> | null
}

export async function recordAudit(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : undefined,
      },
    })
  } catch (error) {
    console.error("[audit] Failed to write audit entry:", error)
  }
}
