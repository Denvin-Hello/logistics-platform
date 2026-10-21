import crypto from "node:crypto"

export function payfastIsConfigured() {
  return !!(process.env.PAYFAST_MERCHANT_ID && process.env.PAYFAST_MERCHANT_KEY)
}

export type PaymentsMode = "demo" | "payfast" | "cod_only"

// Production must never simulate a successful payment. Without credentials the
// safe default is cash/card on delivery.
export function paymentsMode(): PaymentsMode {
  const configured = payfastIsConfigured()
  const raw = (process.env.PAYMENTS_MODE || "").toLowerCase()

  if (raw === "cod_only") return "cod_only"
  if (raw === "payfast") return configured ? "payfast" : "cod_only"
  if (raw === "demo") return process.env.NODE_ENV === "production" ? "cod_only" : "demo"

  if (configured) return "payfast"
  return process.env.NODE_ENV === "production" ? "cod_only" : "demo"
}

export function payfastCheckoutUrl() {
  const hosted = process.env.PAYFAST_HOSTED_PAYMENTS
  const live = hosted === "1" || hosted === "true"
  return live ? "https://www.payfast.co.za/eng/process" : "https://sandbox.payfast.co.za/eng/process"
}

export function signPayFast(fields: Record<string, string>, passphrase?: string) {
  const paramString = Object.keys(fields)
    .filter((key) => fields[key] !== "" && fields[key] !== null)
    .sort()
    .map((key) => `${key}=${encodeURIComponent(fields[key])}`)
    .join("&")

  const stringToHash = passphrase ? `${paramString}&passphrase=${passphrase}` : paramString
  return crypto.createHash("md5").update(stringToHash).digest("hex")
}

export function verifyPayFastSignature(
  params: Record<string, string>,
  receivedSignature: string | undefined,
  passphrase?: string,
) {
  if (!receivedSignature) return false
  const signature = signPayFast(params, passphrase)
  return signature === receivedSignature
}

export function buildPayFastCheckout(input: {
  mPaymentId: string
  amount: number
  itemName: string
  itemDescription: string
  customerName: string
  customerEmail: string
  returnUrl: string
  cancelUrl: string
  notifyUrl: string
}) {
  const fields: Record<string, string> = {
    merchant_id: process.env.PAYFAST_MERCHANT_ID || "",
    merchant_key: process.env.PAYFAST_MERCHANT_KEY || "",
    m_payment_id: input.mPaymentId,
    amount: input.amount.toFixed(2),
    item_name: input.itemName,
    item_description: input.itemDescription,
    name_first: input.customerName.split(" ")[0] || "",
    name_last: input.customerName.split(" ").slice(1).join(" ") || "",
    email_address: input.customerEmail,
    return_url: input.returnUrl,
    cancel_url: input.cancelUrl,
    notify_url: input.notifyUrl,
  }

  const signature = signPayFast(fields, process.env.PAYFAST_PASSPHRASE || undefined)

  return { url: payfastCheckoutUrl(), fields: { ...fields, signature } }
}