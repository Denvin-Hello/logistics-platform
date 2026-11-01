import assert from "node:assert/strict"
import { test } from "node:test"
import {
  MS_PER_DAY,
  REQUIRED_DOCUMENT_TYPES,
  daysUntil,
  effectiveDocumentStatus,
  missingDocumentRequirements,
  nextReminderThreshold,
  requiredDocumentTypes,
} from "../lib/compliance-rules.ts"

const now = new Date("2026-10-26T00:00:00.000Z")
const inDays = (days: number) => new Date(now.getTime() + days * MS_PER_DAY)

test("daysUntil counts whole days until expiry", () => {
  assert.equal(daysUntil(inDays(30), now), 30)
  assert.equal(daysUntil(inDays(1), now), 1)
  assert.equal(daysUntil(now, now), 0)
  assert.equal(daysUntil(inDays(-2), now), -2)
})

test("effective status honors review state and expiry", () => {
  assert.equal(effectiveDocumentStatus({ status: "PENDING", expiresAt: inDays(10) }, now), "PENDING")
  assert.equal(effectiveDocumentStatus({ status: "REJECTED", expiresAt: inDays(10) }, now), "REJECTED")
  assert.equal(effectiveDocumentStatus({ status: "EXPIRED", expiresAt: inDays(10) }, now), "EXPIRED")
  assert.equal(effectiveDocumentStatus({ status: "VERIFIED", expiresAt: inDays(10) }, now), "VERIFIED")
  assert.equal(effectiveDocumentStatus({ status: "VERIFIED", expiresAt: inDays(-1) }, now), "EXPIRED")
})

test("approval and order acceptance require the same mandatory document types", () => {
  assert.equal(requiredDocumentTypes("APPROVAL").length, REQUIRED_DOCUMENT_TYPES.length)
  assert.deepEqual(requiredDocumentTypes("ACCEPT_ORDER"), requiredDocumentTypes("APPROVAL"))
  assert.equal(REQUIRED_DOCUMENT_TYPES.includes("GOODS_IN_TRANSIT_INSURANCE"), false)
})

test("missingDocumentRequirements ignores valid documents and flags expired ones", () => {
  const valid = REQUIRED_DOCUMENT_TYPES.map((type) => ({
    type,
    status: "VERIFIED",
    expiresAt: inDays(90),
  }))

  assert.deepEqual(missingDocumentRequirements(valid, "ACCEPT_ORDER", now), [])
  assert.deepEqual(
    missingDocumentRequirements([], "APPROVAL", now),
    [...REQUIRED_DOCUMENT_TYPES],
  )

  const expired = valid.map((document) =>
    document.type === "DRIVERS_LICENSE" ? { ...document, expiresAt: inDays(-1) } : document,
  )
  assert.deepEqual(missingDocumentRequirements(expired, "ACCEPT_ORDER", now), ["DRIVERS_LICENSE"])

  const pending = valid.map((document) =>
    document.type === "VEHICLE_INSURANCE" ? { ...document, status: "PENDING" } : document,
  )
  assert.deepEqual(missingDocumentRequirements(pending, "ACCEPT_ORDER", now), ["VEHICLE_INSURANCE"])
})

test("nextReminderThreshold sends the nearest milestone once", () => {
  assert.equal(nextReminderThreshold(45, []), null)
  assert.equal(nextReminderThreshold(30, []), 30)
  assert.equal(nextReminderThreshold(20, []), 30)
  assert.equal(nextReminderThreshold(5, []), 7)
  assert.equal(nextReminderThreshold(0, []), 0)
  assert.equal(nextReminderThreshold(-3, []), 0)
  assert.equal(nextReminderThreshold(20, [30]), null)
  assert.equal(nextReminderThreshold(10, [30]), 14)
  assert.equal(nextReminderThreshold(10, [30, 14]), null)
  assert.equal(nextReminderThreshold(6, [30, 14]), 7)
  assert.equal(nextReminderThreshold(6, [30, 14, 7]), null)
  assert.equal(nextReminderThreshold(0, [30, 14, 7, 1]), 0)
  assert.equal(nextReminderThreshold(0, [30, 14, 7, 1, 0]), null)
})
