import { prisma } from "@/lib/prisma"
import { getProviderCompliance, getProviderComplianceBatch } from "@/lib/compliance"
import { notifyAdmins, notifyUser } from "@/lib/notifications"
import { recordAudit } from "@/lib/audit"
import { formatRands } from "@/lib/format"
import {
  getAssignmentPolicy,
  isAutoAssignmentEnabled,
  isOpenPoolAfterEscalation,
  shouldEmailOffers,
} from "@/lib/assignment-policy"
import {
  assignmentPhase,
  isOpenOrderStatus,
  isOfferActive,
  offerBatchSize,
  offerExpiry,
  rankProviders,
  type AssignmentOptions,
  type AssignmentOrder,
  type AssignmentProvider,
} from "@/lib/assignment-rules"

export class AssignmentError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public details?: unknown,
  ) {
    super(message)
    this.name = "AssignmentError"
  }
}

interface CandidateProvider extends AssignmentProvider {
  email: string | null
  name: string | null
  businessName: string | null
}

interface AutoOfferOptions {
  now?: Date
  force?: boolean
  ignoreMaxAttempts?: boolean
  clearPending?: boolean
  radiusOverrideKm?: number
  ignoreServiceArea?: boolean
}

const RETRY_COOLDOWN_MS = 2 * 60_000
const OPEN_STATUSES = ["PRICE_AGREED", "PENDING"]

function toAssignmentOrder(order: {
  id: string
  status: string
  pickupAddress: string
  pickupLat: number | null
  pickupLng: number | null
  chargeableWeightKg: number | null
  weight: number
  createdAt: Date
  assignedProviderId: string | null
  assignmentAttempts: number
  assignmentEscalatedAt: Date | null
  assignmentUrgent: boolean
}): AssignmentOrder {
  return {
    id: order.id,
    status: order.status,
    pickupAddress: order.pickupAddress,
    pickupLat: order.pickupLat,
    pickupLng: order.pickupLng,
    chargeableWeightKg: order.chargeableWeightKg,
    weight: order.weight,
    createdAt: order.createdAt,
    assignedProviderId: order.assignedProviderId,
    assignmentAttempts: order.assignmentAttempts,
    assignmentEscalatedAt: order.assignmentEscalatedAt,
    assignmentUrgent: order.assignmentUrgent,
  }
}

async function loadCandidates(
  orderId: string,
  now = new Date(),
): Promise<{ candidates: CandidateProvider[] }> {
  const [providers, offers, declines] = await Promise.all([
    prisma.user.findMany({
      where: { role: "PROVIDER", status: "APPROVED", isAvailable: true },
      select: {
        id: true,
        status: true,
        isAvailable: true,
        email: true,
        name: true,
        businessName: true,
        vehicleType: true,
        vehicleCapacityKg: true,
        serviceArea: true,
        serviceAreaLat: true,
        serviceAreaLng: true,
        serviceRadiusKm: true,
        yearsExperience: true,
        lastAssignedAt: true,
      },
      take: 200,
    }),
    prisma.orderOffer.findMany({
      where: { orderId },
      select: { providerId: true, status: true, expiresAt: true },
    }),
    prisma.orderDecline.findMany({
      where: { orderId },
      select: { providerId: true },
    }),
  ])

  const providerIds = providers.map((provider) => provider.id)
  const [activeCounts, compliance] = await Promise.all([
    providerIds.length
      ? prisma.order.groupBy({
          by: ["assignedProviderId"],
          where: {
            assignedProviderId: { in: providerIds },
            status: { in: ["ASSIGNED", "IN_TRANSIT"] },
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    getProviderComplianceBatch(providerIds),
  ])

  const activeByProvider = new Map<string, number>()
  for (const row of activeCounts) {
    if (row.assignedProviderId) {
      activeByProvider.set(row.assignedProviderId, row._count._all)
    }
  }

  const offerByProvider = new Map<string, { status: string; expiresAt: Date }>()
  for (const offer of offers) {
    offerByProvider.set(offer.providerId, { status: offer.status, expiresAt: offer.expiresAt })
  }

  const declined = new Set(declines.map((row) => row.providerId))

  const candidates: CandidateProvider[] = providers.map((provider) => ({
    id: provider.id,
    status: provider.status,
    isAvailable: provider.isAvailable,
    email: provider.email,
    name: provider.name,
    businessName: provider.businessName,
    vehicleType: provider.vehicleType,
    vehicleCapacityKg: provider.vehicleCapacityKg,
    serviceArea: provider.serviceArea,
    serviceAreaLat: provider.serviceAreaLat,
    serviceAreaLng: provider.serviceAreaLng,
    serviceRadiusKm: provider.serviceRadiusKm,
    yearsExperience: provider.yearsExperience,
    lastAssignedAt: provider.lastAssignedAt,
    activeJobs: activeByProvider.get(provider.id) ?? 0,
    complianceOk: compliance.get(provider.id)?.ok ?? false,
    hasDeclined: declined.has(provider.id),
    hasOffer: (() => {
      const offer = offerByProvider.get(provider.id)
      return offer?.status === "PENDING" && offer.expiresAt.getTime() > now.getTime()
    })(),
  }))

  return { candidates }
}

function orderLabel(order: { orderNumber: string; pickupAddress: string; deliveryAddress: string; amount: number }) {
  return `${order.orderNumber}: ${order.pickupAddress} → ${order.deliveryAddress} · ${formatRands(order.amount)}`
}

export async function autoOfferOrder(orderId: string, options: AutoOfferOptions = {}) {
  const now = options.now ?? new Date()
  const policy = getAssignmentPolicy()
  const order = await prisma.order.findUnique({ where: { id: orderId } })

  if (!order) throw new AssignmentError("ORDER_NOT_FOUND", "Order not found.", 404)
  if (!options.force && !isAutoAssignmentEnabled()) {
    return { created: 0, eligible: 0, phase: "none" as const, skipped: "disabled" }
  }
  if (order.assignedProviderId) {
    return { created: 0, eligible: 0, phase: "none" as const, skipped: "assigned" }
  }
  if (!isOpenOrderStatus(order.status)) {
    return { created: 0, eligible: 0, phase: "none" as const, skipped: "closed" }
  }

  if (options.clearPending) {
    await prisma.orderOffer.updateMany({
      where: { orderId, status: "PENDING" },
      data: { status: "EXPIRED", respondedAt: now },
    })
  }

  const activeOffers = await prisma.orderOffer.count({
    where: { orderId, status: "PENDING", expiresAt: { gt: now } },
  })
  if (activeOffers > 0) {
    return { created: 0, eligible: 0, phase: "retry" as const, skipped: "pending_offers" }
  }

  if (
    !options.force &&
    order.assignmentLastAttemptAt &&
    now.getTime() - order.assignmentLastAttemptAt.getTime() < RETRY_COOLDOWN_MS
  ) {
    return { created: 0, eligible: 0, phase: "retry" as const, skipped: "cooldown" }
  }

  const input = toAssignmentOrder(order)
  const phase = assignmentPhase(input, now, policy)
  if (phase === "none") {
    return { created: 0, eligible: 0, phase, skipped: "not_assignable" }
  }

  if (
    phase === "retry" &&
    order.assignmentAttempts >= policy.maxAttempts &&
    !options.ignoreMaxAttempts
  ) {
    return { created: 0, eligible: 0, phase, skipped: "max_attempts" }
  }

  const shouldEscalate = phase === "escalated" && !order.assignmentEscalatedAt
  const shouldUrgent = phase === "urgent" && !order.assignmentUrgent
  const ruleOptions: AssignmentOptions = {
    radiusOverrideKm:
      options.radiusOverrideKm ??
      (phase === "escalated" ? policy.radiusKm + policy.widenRadiusKm : undefined),
    ignoreServiceArea: options.ignoreServiceArea ?? phase === "urgent",
  }

  const { candidates } = await loadCandidates(orderId, now)
  const ranked = rankProviders(candidates, input, policy, ruleOptions)
  const selected = ranked.slice(0, offerBatchSize(phase, policy))
  const expiresAt = offerExpiry(now, policy)
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]))
  const createdOffers: Array<{ providerId: string; rank: number; distanceM: number | null }> = []

  for (const [index, entry] of selected.entries()) {
    await prisma.orderOffer.upsert({
      where: { orderId_providerId: { orderId, providerId: entry.provider.id } },
      update: {
        status: "PENDING",
        rank: index + 1,
        distanceM: entry.distanceM,
        expiresAt,
        respondedAt: null,
      },
      create: {
        orderId,
        providerId: entry.provider.id,
        status: "PENDING",
        rank: index + 1,
        distanceM: entry.distanceM,
        expiresAt,
      },
    })
    createdOffers.push({ providerId: entry.provider.id, rank: index + 1, distanceM: entry.distanceM })
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      assignmentAttempts: { increment: 1 },
      assignmentLastAttemptAt: now,
      ...(shouldEscalate ? { assignmentEscalatedAt: now } : {}),
      ...(shouldUrgent ? { assignmentUrgent: true } : {}),
    },
  })

  const emailTopOffer = shouldEmailOffers()
  await Promise.all(
    createdOffers.map(async (created) => {
      const provider = candidateById.get(created.providerId)
      if (!provider) return
      const isTop = created.rank === 1
      const email =
        emailTopOffer && isTop && provider.email
          ? {
              to: provider.email,
              subject: `New delivery offer · ${order.orderNumber}`,
              text: `${orderLabel(order)}\n\nOpen your provider dashboard to accept before the offer expires.`,
            }
          : undefined

      await notifyUser({
        userId: provider.id,
        type: "ORDER_OFFER",
        title: "New delivery offer",
        body: orderLabel(order),
        href: "/provider",
        email,
      })
    }),
  )

  if (shouldEscalate || shouldUrgent) {
    await notifyAdmins({
      type: shouldUrgent ? "ORDER_ASSIGNMENT_URGENT" : "ORDER_ASSIGNMENT_ESCALATED",
      title: shouldUrgent ? "Delivery needs urgent dispatch" : "Delivery needs dispatch attention",
      body: `${order.orderNumber} has no accepted offer after ${Math.round(
        (now.getTime() - order.createdAt.getTime()) / 60_000,
      )} min. Eligible providers: ${ranked.length}.`,
      href: "/admin/dispatch",
      email: {
        subject: shouldUrgent
          ? `Urgent dispatch needed · ${order.orderNumber}`
          : `Dispatch attention needed · ${order.orderNumber}`,
        text: `${order.orderNumber} is still unassigned.`,
      },
    })
  }

  await recordAudit({
    action: shouldUrgent
      ? "order.assignment.urgent"
      : shouldEscalate
        ? "order.assignment.escalated"
        : "order.offers.created",
    entityType: "Order",
    entityId: orderId,
    metadata: {
      phase,
      eligible: ranked.length,
      offered: createdOffers.length,
      radiusKm: ruleOptions.radiusOverrideKm ?? policy.radiusKm,
      ignoreServiceArea: ruleOptions.ignoreServiceArea ?? false,
    },
  })

  return {
    created: createdOffers.length,
    eligible: ranked.length,
    phase,
    escalated: shouldEscalate,
    urgent: shouldUrgent,
  }
}

export async function acceptOffer(orderId: string, providerId: string, actorId?: string | null) {
  const now = new Date()
  const order = await prisma.order.findUnique({ where: { id: orderId } })

  if (!order) throw new AssignmentError("ORDER_NOT_FOUND", "Order not found.", 404)
  if (order.assignedProviderId === providerId && order.status === "ASSIGNED") {
    return { order, alreadyAssigned: true as const }
  }
  if (order.assignedProviderId && order.assignedProviderId !== providerId) {
    throw new AssignmentError("ORDER_ALREADY_ASSIGNED", "This delivery has already been accepted by another provider.", 409)
  }
  if (!isOpenOrderStatus(order.status)) {
    throw new AssignmentError("ORDER_NOT_OPEN", "This delivery is no longer open to providers.", 409)
  }

  const offer = await prisma.orderOffer.findUnique({
    where: { orderId_providerId: { orderId, providerId } },
  })
  if (!offer) {
    throw new AssignmentError("OFFER_NOT_FOUND", "This delivery was not offered to you.", 403)
  }
  if (!isOfferActive(offer, now)) {
    throw new AssignmentError("OFFER_EXPIRED", "This offer has expired. Wait for the next offer or the open pool.", 409)
  }

  const compliance = await getProviderCompliance(providerId, "ACCEPT_ORDER")
  if (!compliance.ok) {
    throw new AssignmentError(
      "COMPLIANCE_REQUIRED",
      "Complete your compliance documents before accepting new deliveries.",
      403,
      { missing: compliance.missing },
    )
  }

  const updated = await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: {
        id: orderId,
        assignedProviderId: null,
        status: { in: OPEN_STATUSES },
      },
      data: {
        assignedProviderId: providerId,
        status: "ASSIGNED",
        acceptedAt: now,
        assignmentUrgent: false,
      },
    })

    if (claimed.count === 0) {
      throw new AssignmentError(
        "ORDER_ALREADY_ASSIGNED",
        "This delivery has already been accepted by another provider.",
        409,
      )
    }

    const accepted = await tx.orderOffer.updateMany({
      where: { id: offer.id, status: "PENDING" },
      data: { status: "ACCEPTED", respondedAt: now },
    })
    if (accepted.count === 0) {
      throw new AssignmentError("OFFER_EXPIRED", "This offer has already been used or expired.", 409)
    }
    await tx.orderOffer.updateMany({
      where: { orderId, status: "PENDING", id: { not: offer.id } },
      data: { status: "CANCELLED", respondedAt: now },
    })
    await tx.user.update({
      where: { id: providerId },
      data: { lastAssignedAt: now },
    })

    return tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { assignedProvider: { select: { name: true, businessName: true, email: true } } },
    })
  })

  const providerName =
    updated.assignedProvider?.businessName?.trim() ||
    updated.assignedProvider?.name?.trim() ||
    "A delivery provider"

  await notifyUser({
    userId: updated.customerId,
    type: "ORDER_ASSIGNED",
    title: "Provider assigned",
    body: `${providerName} accepted ${updated.orderNumber}. Track the delivery from your orders page.`,
    href: `/customer/orders/${updated.id}`,
    email: {
      to: updated.customerEmail,
      subject: `Provider assigned · ${updated.orderNumber}`,
      text: `${providerName} accepted ${updated.orderNumber}. You can follow the delivery in your LogiConnect account.`,
    },
  })

  await recordAudit({
    actorId: actorId ?? providerId,
    action: "order.offer.accepted",
    entityType: "Order",
    entityId: orderId,
    metadata: { providerId, offerId: offer.id },
  })

  return { order: updated, alreadyAssigned: false as const }
}

export async function declineOffer(orderId: string, providerId: string, reason?: string | null) {
  const now = new Date()
  const order = await prisma.order.findUnique({ where: { id: orderId } })

  if (!order) throw new AssignmentError("ORDER_NOT_FOUND", "Order not found.", 404)
  if (order.assignedProviderId) {
    throw new AssignmentError("ORDER_ALREADY_ASSIGNED", "This delivery has already been assigned.", 409)
  }

  const offer = await prisma.orderOffer.findUnique({
    where: { orderId_providerId: { orderId, providerId } },
  })
  if (!offer || offer.status !== "PENDING") {
    throw new AssignmentError("OFFER_NOT_FOUND", "This delivery is not currently offered to you.", 403)
  }
  if (offer.expiresAt.getTime() <= now.getTime()) {
    throw new AssignmentError("OFFER_EXPIRED", "This offer has expired.", 409)
  }

  await prisma.$transaction([
    prisma.orderOffer.update({
      where: { id: offer.id },
      data: { status: "DECLINED", respondedAt: now },
    }),
    prisma.orderDecline.upsert({
      where: { orderId_providerId: { orderId, providerId } },
      update: { reason: reason?.trim() || null },
      create: { orderId, providerId, reason: reason?.trim() || null },
    }),
  ])

  await recordAudit({
    actorId: providerId,
    action: "order.offer.declined",
    entityType: "Order",
    entityId: orderId,
    metadata: { providerId, reason: reason?.trim() || null },
  })

  const pending = await prisma.orderOffer.count({
    where: { orderId, status: "PENDING", expiresAt: { gt: now } },
  })
  if (pending === 0) {
    await autoOfferOrder(orderId, { force: true, now })
  }

  return { declined: true as const }
}

export async function expireOffers(now = new Date()) {
  const stale = await prisma.orderOffer.findMany({
    where: { status: "PENDING", expiresAt: { lte: now } },
    select: { id: true, orderId: true },
    take: 250,
  })

  if (stale.length === 0) return { expired: 0, orders: 0, created: 0 }

  await prisma.orderOffer.updateMany({
    where: { id: { in: stale.map((offer) => offer.id) } },
    data: { status: "EXPIRED", respondedAt: now },
  })

  const orderIds = Array.from(new Set(stale.map((offer) => offer.orderId)))
  let created = 0
  for (const orderId of orderIds) {
    try {
      const result = await autoOfferOrder(orderId, { force: true, now })
      created += result.created
    } catch (error) {
      console.error("[assignment] Failed to re-offer after expiry:", orderId, error)
    }
  }

  await recordAudit({
    action: "order.offers.expired",
    entityType: "Order",
    metadata: { expired: stale.length, orders: orderIds.length, created },
  })

  return { expired: stale.length, orders: orderIds.length, created }
}

export async function sweepAssignments(now = new Date()) {
  const expiry = await expireOffers(now)
  const orders = await prisma.order.findMany({
    where: {
      status: { in: OPEN_STATUSES },
      assignedProviderId: null,
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: 100,
  })

  let sweepCreated = 0
  let checked = 0
  for (const order of orders) {
    checked += 1
    try {
      const result = await autoOfferOrder(order.id, { now })
      sweepCreated += result.created
    } catch (error) {
      console.error("[assignment] Sweep failed for order:", order.id, error)
    }
  }

  return { ...expiry, checked, created: expiry.created + sweepCreated }
}

export async function retryAssignment(
  orderId: string,
  options: { widen?: boolean; actorId?: string | null } = {},
) {
  const policy = getAssignmentPolicy()
  const result = await autoOfferOrder(orderId, {
    force: true,
    ignoreMaxAttempts: true,
    clearPending: true,
    radiusOverrideKm: options.widen ? policy.radiusKm + policy.widenRadiusKm : undefined,
  })

  await recordAudit({
    actorId: options.actorId ?? null,
    action: options.widen ? "order.assignment.widened" : "order.assignment.retried",
    entityType: "Order",
    entityId: orderId,
    metadata: { created: result.created, eligible: result.eligible, phase: result.phase },
  })

  return result
}

export async function manualAssignOrder(
  orderId: string,
  providerId: string,
  actorId: string,
  reason?: string | null,
) {
  const now = new Date()
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) throw new AssignmentError("ORDER_NOT_FOUND", "Order not found.", 404)
  if (order.assignedProviderId) {
    throw new AssignmentError("ORDER_ALREADY_ASSIGNED", "This delivery is already assigned.", 409)
  }
  if (!isOpenOrderStatus(order.status)) {
    throw new AssignmentError("ORDER_NOT_OPEN", "This delivery is not open for assignment.", 409)
  }

  const provider = await prisma.user.findUnique({
    where: { id: providerId },
    select: { id: true, role: true, status: true, name: true, businessName: true, email: true },
  })
  if (!provider || provider.role !== "PROVIDER") {
    throw new AssignmentError("PROVIDER_NOT_FOUND", "Provider not found.", 404)
  }
  if (provider.status !== "APPROVED") {
    throw new AssignmentError("PROVIDER_NOT_APPROVED", "This provider is not approved.", 409)
  }

  const compliance = await getProviderCompliance(providerId, "ACCEPT_ORDER")
  if (!compliance.ok) {
    throw new AssignmentError(
      "COMPLIANCE_REQUIRED",
      "This provider still needs verified compliance documents.",
      409,
      { missing: compliance.missing },
    )
  }

  const updated = await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: orderId, assignedProviderId: null, status: { in: OPEN_STATUSES } },
      data: {
        assignedProviderId: providerId,
        status: "ASSIGNED",
        acceptedAt: now,
        assignmentUrgent: false,
      },
    })
    if (claimed.count === 0) {
      throw new AssignmentError("ORDER_ALREADY_ASSIGNED", "This delivery is already assigned.", 409)
    }

    await tx.orderOffer.updateMany({
      where: { orderId, status: "PENDING" },
      data: { status: "CANCELLED", respondedAt: now },
    })
    await tx.user.update({
      where: { id: providerId },
      data: { lastAssignedAt: now },
    })

    return tx.order.findUniqueOrThrow({ where: { id: orderId } })
  })

  const providerName = provider.businessName?.trim() || provider.name?.trim() || "A delivery provider"

  await notifyUser({
    userId: updated.customerId,
    type: "ORDER_ASSIGNED",
    title: "Provider assigned",
    body: `${providerName} was assigned to ${updated.orderNumber}.`,
    href: `/customer/orders/${updated.id}`,
    email: {
      to: updated.customerEmail,
      subject: `Provider assigned · ${updated.orderNumber}`,
      text: `${providerName} was assigned to ${updated.orderNumber}.`,
    },
  })

  await notifyUser({
    userId: provider.id,
    type: "ORDER_ASSIGNED",
    title: "Delivery assigned to you",
    body: orderLabel(updated),
    href: "/provider",
    email: provider.email
      ? {
          to: provider.email,
          subject: `Delivery assigned · ${updated.orderNumber}`,
          text: `Dispatch assigned ${updated.orderNumber} to you.`,
        }
      : undefined,
  })

  await recordAudit({
    actorId,
    action: "order.assignment.manual",
    entityType: "Order",
    entityId: orderId,
    metadata: { providerId, reason: reason?.trim() || null },
  })

  return updated
}

export async function listProviderOffers(providerId: string, now = new Date()) {
  return prisma.orderOffer.findMany({
    where: {
      providerId,
      status: "PENDING",
      expiresAt: { gt: now },
      order: { assignedProviderId: null, status: { in: OPEN_STATUSES } },
    },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          pickupAddress: true,
          deliveryAddress: true,
          packageType: true,
          amount: true,
          weight: true,
          createdAt: true,
        },
      },
    },
    orderBy: [{ rank: "asc" }, { expiresAt: "asc" }],
  })
}

export async function isProviderEligibleForOrder(providerId: string, orderId: string) {
  const [order, provider] = await Promise.all([
    prisma.order.findUnique({ where: { id: orderId } }),
    prisma.user.findUnique({ where: { id: providerId } }),
  ])
  if (!order || !provider) return false
  const compliance = await getProviderCompliance(providerId, "ACCEPT_ORDER")
  const activeJobs = await prisma.order.count({
    where: { assignedProviderId: providerId, status: { in: ["ASSIGNED", "IN_TRANSIT"] } },
  })
  const offers = await prisma.orderOffer.findMany({
    where: { orderId, providerId },
    select: { status: true },
  })
  const declines = await prisma.orderDecline.count({ where: { orderId, providerId } })

  const policy = getAssignmentPolicy()
  const candidates = [{
    id: provider.id,
    status: provider.status,
    isAvailable: provider.isAvailable,
    vehicleType: provider.vehicleType,
    vehicleCapacityKg: provider.vehicleCapacityKg,
    serviceArea: provider.serviceArea,
    serviceAreaLat: provider.serviceAreaLat,
    serviceAreaLng: provider.serviceAreaLng,
    serviceRadiusKm: provider.serviceRadiusKm,
    yearsExperience: provider.yearsExperience,
    lastAssignedAt: provider.lastAssignedAt,
    activeJobs,
    complianceOk: compliance.ok,
    hasDeclined: declines > 0,
    hasOffer: offers.some((offer) => ["PENDING", "ACCEPTED", "DECLINED"].includes(offer.status)),
  }]

  return rankProviders(candidates, toAssignmentOrder(order), policy, {
    ignoreServiceArea: isOpenPoolAfterEscalation() && order.assignmentUrgent,
  }).length > 0
}
