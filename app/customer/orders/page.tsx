import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { formatRands } from "@/lib/format"
import Link from "next/link"
import React from "react"

export default async function CustomerOrdersPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) return null

  const orders = await prisma.order.findMany({
    where: { customerId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-semibold mb-4">Your Orders</h1>
      {orders.length === 0 ? (
        <p>No orders yet. Create a new delivery to get started.</p>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li key={o.id} className="p-4 border rounded-md">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm text-muted-foreground">{o.orderNumber}</div>
                  <div className="text-lg font-medium">{o.description || o.packageDescription}</div>
                  <div className="text-sm text-gray-600">Status: {o.status || "PENDING"}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm">Amount: {formatRands(o.amount)}</div>
                  <div className="text-xs text-gray-500">{o.createdAt.toISOString()}</div>
                  <div className="mt-2">
                    <Link href={`/customer/orders/${o.id}`} className="text-sm text-blue-600">View</Link>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
