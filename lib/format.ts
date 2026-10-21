// Amounts are stored as whole Rands (Int) on the Order model.
export function formatRands(amount: number): string {
  return `R${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Dates are formatted with a fixed locale and South African offset so the
// server-rendered markup matches the browser during hydration.
const SAST_OFFSET_MS = 2 * 60 * 60 * 1000
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function toSast(value: Date | string | number): Date | null {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Date(date.getTime() + SAST_OFFSET_MS)
}

function pad(value: number): string {
  return String(value).padStart(2, "0")
}

export function formatDate(value: Date | string | number): string {
  const date = toSast(value)
  if (!date) return "—"
  return `${pad(date.getUTCDate())} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

export function formatTime(value: Date | string | number): string {
  const date = toSast(value)
  if (!date) return "—"
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
}

export function formatDateTime(value: Date | string | number): string {
  const date = toSast(value)
  if (!date) return "—"
  return `${formatDate(value)}, ${formatTime(value)}`
}

export function escapeHtml(value: string | null | undefined): string {
  return (value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}