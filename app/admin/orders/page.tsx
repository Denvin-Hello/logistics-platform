import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { OrdersTable } from "@/components/admin/orders-table"
import { OrderFilters } from "@/components/admin/order-filters"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 10
const STATUSES = ["ALL", "PENDING", "AWAITING_PAYMENT", "PAID", "ASSIGNED", "IN_TRANSIT", "DELIVERED", "CANCELLED"]

type SearchParams = { q?: string; status?: string; page?: string }

function buildHref(q: string, status: string, page: number) {
  const params = new URLSearchParams()
  if (q) params.set("q", q)
  if (status !== "ALL") params.set("status", status)
  if (page > 1) params.set("page", String(page))
  const s = params.toString()
  return `/admin/orders${s ? `?${s}` : ""}`
}

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const q = (searchParams.q ?? "").trim()
  const status = STATUSES.includes(searchParams.status ?? "") ? searchParams.status! : "ALL"
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1)

  const where: Prisma.OrderWhereInput = {
    ...(q
      ? {
          OR: [
            { orderNumber: { contains: q, mode: "insensitive" } },
            { customerName: { contains: q, mode: "insensitive" } },
            { customerEmail: { contains: q, mode: "insensitive" } },
            { pickupAddress: { contains: q, mode: "insensitive" } },
            { deliveryAddress: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(status !== "ALL" ? { status } : {}),
  }

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { assignedProvider: { select: { businessName: true, name: true } } },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  const mappedOrders = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customer: o.customerName,
    provider: o.assignedProvider?.businessName || o.assignedProvider?.name || "—",
    pickup: o.pickupAddress,
    delivery: o.deliveryAddress,
    status: o.status,
    amount: o.amount,
    date: o.createdAt.toISOString().slice(0, 10),
  }))

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />

      <div className="flex-1 overflow-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground">
            {total} order{total === 1 ? "" : "s"} · Page {safePage} of {totalPages}
          </p>
        </div>

        <OrderFilters initialQuery={q} initialStatus={status} />

        <OrdersTable orders={mappedOrders} />

        <div className="mt-6 flex items-center justify-center gap-2">
          <Button asChild variant="outline" size="sm" disabled={safePage <= 1}>
            <Link href={buildHref(q, status, safePage - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Button
              key={p}
              asChild
              variant={p === safePage ? "default" : "outline"}
              size="sm"
              className={p === safePage ? "" : "text-muted-foreground"}
            >
              <Link href={buildHref(q, status, p)}>{p}</Link>
            </Button>
          ))}
          <Button asChild variant="outline" size="sm" disabled={safePage >= totalPages}>
            <Link href={buildHref(q, status, safePage + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}