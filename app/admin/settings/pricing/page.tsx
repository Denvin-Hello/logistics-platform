import { prisma } from "@/lib/prisma"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { PricingConfigForm } from "@/components/admin/pricing-config-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatDateTime, formatRands } from "@/lib/format"
import { loadActivePricingConfig } from "@/lib/pricing-config"

export const dynamic = "force-dynamic"

export default async function AdminPricingPage() {
  let active: Awaited<ReturnType<typeof loadActivePricingConfig>> | null = null
  let loadError: string | null = null

  try {
    active = await loadActivePricingConfig()
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unable to load pricing configuration."
  }

  const history = await prisma.pricingConfig.findMany({
    orderBy: { version: "desc" },
    take: 10,
    select: {
      id: true,
      version: true,
      isActive: true,
      baseFare: true,
      minimumFare: true,
      quoteTtlMinutes: true,
      createdAt: true,
    },
  })

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />

      <div className="flex-1 overflow-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Delivery Pricing</h1>
          <p className="text-muted-foreground">
            Distance-based pricing for new quotes. Existing quotes keep the snapshot they were created with.
          </p>
        </div>

        {loadError || !active ? (
          <Card>
            <CardHeader>
              <CardTitle>Pricing unavailable</CardTitle>
              <CardDescription>{loadError ?? "No active pricing configuration was found."}</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <PricingConfigForm version={active.row.version} config={active.config} />

            <Card className="self-start">
              <CardHeader>
                <CardTitle>Version history</CardTitle>
                <CardDescription>Most recent pricing versions.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Version</TableHead>
                      <TableHead>Base</TableHead>
                      <TableHead>Minimum</TableHead>
                      <TableHead>TTL</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            v{row.version}
                            {row.isActive ? <Badge>Active</Badge> : null}
                          </div>
                        </TableCell>
                        <TableCell>{formatRands(row.baseFare)}</TableCell>
                        <TableCell>{formatRands(row.minimumFare)}</TableCell>
                        <TableCell>{row.quoteTtlMinutes}m</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(row.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
