"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  isCatalogItemBlocked,
  PACKAGE_CATALOG,
  searchCatalogItems,
  type CatalogItem,
} from "@/lib/package-catalog"
import { Package, Search } from "lucide-react"

function ItemBadge({ item }: { item: CatalogItem }) {
  const blocked = isCatalogItemBlocked(item)

  if (blocked) {
    return (
      <Badge variant="outline" className="cursor-not-allowed text-muted-foreground line-through">
        {item.label}
      </Badge>
    )
  }

  return (
    <Link href={`/customer/new-order?items=${encodeURIComponent(item.value)}`}>
      <Badge variant="outline" className="transition-colors hover:bg-accent/10">
        {item.label}
      </Badge>
    </Link>
  )
}

export function PackageTypeGrid() {
  const [search, setSearch] = useState("")
  const query = search.trim()
  const matches = useMemo(() => (query ? searchCatalogItems(query) : []), [query])

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search items, e.g. fridge, laptop, couch, tyres..."
          className="pl-9"
          aria-label="Search items"
        />
      </div>

      {query ? (
        matches.length > 0 ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {matches.length} item{matches.length === 1 ? "" : "s"} matching “{query}”
              </CardTitle>
              <CardDescription>Hazardous items are shown but cannot be quoted online.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {matches.map((item) => (
                <div key={item.value} className="flex flex-wrap items-center gap-2">
                  <ItemBadge item={item} />
                  <span className="text-xs text-muted-foreground">
                    {item.categoryLabel} &gt; {item.subcategoryLabel}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No items match “{query}”.
            </CardContent>
          </Card>
        )
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {PACKAGE_CATALOG.map((category) => {
            const itemCount = category.subcategories.reduce(
              (sum, subcategory) => sum + subcategory.items.length,
              0,
            )

            return (
              <Card key={category.value}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="h-4 w-4 text-accent" />
                    {category.label}
                  </CardTitle>
                  <CardDescription>
                    {itemCount} item{itemCount === 1 ? "" : "s"} across {category.subcategories.length}{" "}
                    subcategor{category.subcategories.length === 1 ? "y" : "ies"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {category.subcategories.map((subcategory) => (
                    <div key={subcategory.value} className="space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {subcategory.label}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {subcategory.items.map((item) => (
                          <ItemBadge key={item.value} item={item} />
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
