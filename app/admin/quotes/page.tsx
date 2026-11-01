import Link from "next/link"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDateTime, formatRands } from "@/lib/format"
import { getCategoryPath } from "@/lib/freight"
import { parcelCatalogPath } from "@/lib/package-catalog"
import { quoteParcels } from "@/lib/quote-order"
import { ChevronLeft, ChevronRight } from "lucide-react"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 20
const STATUSES = ["ALL", "OPEN", "CONSUMED", "EXPIRED"]

type SearchParams = { status?: string; page?: string }

function buildHref(status: string, page: number) {
  const params = new URLSearchParams()
  if (status !== "ALL") params.set("status", status)
  if (page > 1) params.set("page", String(page))
  const query = params.toString()
  return `/admin/quotes${query ? `?${query}` : ""}`
}

function statusVariant(status: string, expired: boolean) {
  if (expired && status === "OPEN") return "destructive" as const
  if (status === "CONSUMED") return "secondary" as const
  if (status === "EXPIRED") return "outline" as const
  return "default" as const
}

export default async function AdminQuotesPage({ searchParams }: { searchParams: SearchParams }) {
  const status = STATUSES.includes(searchParams.status ?? "") ? searchParams.status! : "ALL"
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1)

  const where: Prisma.QuoteWhereInput = status !== "ALL" ? { status } : {}

  const [total, quotes] = await Promise.all([
    prisma.quote.count({ where }),
    prisma.quote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        customer: { select: { name: true, email: true } },
        order: { select: { id: true, orderNumber: true } },
      },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const now = Date.now()

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />

      <div className="flex-1 overflow-auto p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Quotes</h1>
          <p className="text-muted-foreground">
            {total} quote{total === 1 ? "" : "s"} · Page {safePage} of {totalPages}
          </p>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {STATUSES.map((value) => (
            <Button
              key={value}
              asChild
              size="sm"
              variant={value === status ? "default" : "outline"}
            >
              <Link href={buildHref(value, 1)}>{value === "ALL" ? "All" : value}</Link>
            </Button>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                      No quotes found.
                    </TableCell>
                  </TableRow>
                ) : (
                  quotes.map((quote) => {
                    const expired = quote.expiresAt.getTime() <= now
                    return (
                      <TableRow key={quote.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDateTime(quote.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{quote.customer.name}</div>
                          <div className="text-xs text-muted-foreground">{quote.customer.email}</div>
                        </TableCell>
                        <TableCell className="max-w-[320px]">
                          <div className="truncate text-sm">{quote.pickupAddress}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            → {quote.deliveryAddress}
                          </div>
                        </TableCell>
                        <TableCell>{quote.source}</TableCell>
                        <TableCell className="max-w-[260px] text-sm">
                          {quoteParcels(quote)
                            .slice(0, 3)
                            .map((parcel) => parcelCatalogPath(parcel) ?? getCategoryPath(parcel.packageType).label)
                            .join(", ")}
                          {quoteParcels(quote).length > 3
                            ? ` +${quoteParcels(quote).length - 3} more`
                            : ""}
                        </TableCell>
                        <TableCell>{quote.distanceKm.toFixed(1)} km</TableCell>
                        <TableCell className="font-medium">{formatRands(quote.total)}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(quote.status, expired)}>
                            {expired && quote.status === "OPEN" ? "OPEN (expired)" : quote.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {quote.order ? (
                            <Link
                              href={`/admin/orders/${quote.order.id}`}
                              className="text-sm text-blue-600"
                            >
                              {quote.order.orderNumber}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="mt-6 flex items-center justify-center gap-2">
          <Button asChild variant="outline" size="sm" disabled={safePage <= 1}>
            <Link href={buildHref(status, safePage - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {safePage} of {totalPages}
          </span>
          <Button asChild variant="outline" size="sm" disabled={safePage >= totalPages}>
            <Link href={buildHref(status, safePage + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
