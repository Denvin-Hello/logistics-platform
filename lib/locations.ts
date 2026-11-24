import { prisma } from "@/lib/prisma"

export async function writeLocation({
  orderId,
  lat,
  lng,
  userId,
}: {
  orderId: string
  lat: number
  lng: number
  userId: string
}) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, assignedProviderId: true, status: true },
  })

  if (!order || order.assignedProviderId !== userId) {
    throw new Error("Not assigned to this order")
  }

  return prisma.location.create({
    data: { orderId, userId, lat, lng },
  })
}

export async function getLatestLocation(orderId: string) {
  return prisma.location.findFirst({
    where: { orderId },
    orderBy: { createdAt: "desc" },
    select: { id: true, lat: true, lng: true, createdAt: true },
  })
}

export async function getLocationHistory(
  orderId: string,
  limit = 100,
) {
  return prisma.location.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, lat: true, lng: true, createdAt: true },
  })
}
