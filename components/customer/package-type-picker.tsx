"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  catalogItemPath,
  getCatalogCategory,
  getCatalogItem,
  getCatalogSubcategory,
  isCatalogItemBlocked,
  PACKAGE_CATALOG,
  searchCatalogItems,
  type CatalogItem,
} from "@/lib/package-catalog"
import { cn } from "@/lib/utils"
import { Package, Search, X } from "lucide-react"

interface PackageTypePickerProps {
  value: string[]
  onChange: (value: string[]) => void
  disabled?: boolean
  className?: string
  idPrefix?: string
}

function ItemRow({
  item,
  checked,
  disabled,
  onToggle,
  idPrefix,
}: {
  item: CatalogItem
  checked: boolean
  disabled: boolean
  onToggle: () => void
  idPrefix: string
}) {
  const blocked = isCatalogItemBlocked(item)
  const itemDisabled = disabled || blocked

  return (
    <label
      htmlFor={`${idPrefix}-item-${item.value}`}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
        checked ? "border-primary/40 bg-primary/5" : "hover:bg-muted/50",
        itemDisabled && "cursor-not-allowed opacity-60",
      )}
    >
      <Checkbox
        id={`${idPrefix}-item-${item.value}`}
        checked={checked}
        disabled={itemDisabled}
        onCheckedChange={onToggle}
        className="mt-0.5"
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{item.label}</span>
          {blocked ? (
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide text-destructive">
              Restricted
            </Badge>
          ) : null}
          {item.custom ? (
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
              Describe your own
            </Badge>
          ) : null}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {item.categoryLabel} &gt; {item.subcategoryLabel}
          {blocked ? " · Cannot be quoted online" : ""}
        </span>
      </span>
    </label>
  )
}

export function PackageTypePicker({
  value,
  onChange,
  disabled = false,
  className,
  idPrefix = "package",
}: PackageTypePickerProps) {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState(() => getCatalogItem(value[0])?.category ?? PACKAGE_CATALOG[0].value)
  const [subcategory, setSubcategory] = useState(() => getCatalogItem(value[0])?.subcategory ?? "all")

  const activeCategory = getCatalogCategory(category)
  const selectedSet = useMemo(() => new Set(value), [value])
  const query = search.trim()
  const searchResults = useMemo(() => (query ? searchCatalogItems(query) : []), [query])

  const browseItems = useMemo(() => {
    if (!activeCategory) return []
    return activeCategory.subcategories
      .filter((entry) => subcategory === "all" || entry.value === subcategory)
      .flatMap((entry) => entry.items)
  }, [activeCategory, subcategory])

  const visibleItems = query ? searchResults : browseItems
  const selectedItems = value
    .map((itemKey) => getCatalogItem(itemKey))
    .filter((item): item is CatalogItem => !!item)

  function toggle(item: CatalogItem) {
    if (disabled || isCatalogItemBlocked(item)) return
    if (selectedSet.has(item.value)) {
      onChange(value.filter((itemKey) => itemKey !== item.value))
    } else {
      onChange([...value, item.value])
    }
  }

  function changeCategory(nextCategory: string) {
    setCategory(nextCategory)
    setSubcategory("all")
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-category`}>Category</Label>
        <Select value={category} onValueChange={changeCategory} disabled={disabled}>
          <SelectTrigger id={`${idPrefix}-category`}>
            <SelectValue placeholder="Choose a category" />
          </SelectTrigger>
          <SelectContent>
            {PACKAGE_CATALOG.map((entry) => (
              <SelectItem key={entry.value} value={entry.value}>
                {entry.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-subcategory`}>Subcategory</Label>
        <Select value={subcategory} onValueChange={setSubcategory} disabled={disabled || !activeCategory}>
          <SelectTrigger id={`${idPrefix}-subcategory`}>
            <SelectValue placeholder="Choose a subcategory" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subcategories</SelectItem>
            {activeCategory?.subcategories.map((entry) => (
              <SelectItem key={entry.value} value={entry.value}>
                {entry.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={`${idPrefix}-search`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search all items, e.g. fridge, laptop, couch, tyres..."
          className="pl-9 pr-9"
          disabled={disabled}
        />
        {search ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            aria-label="Clear search"
            onClick={() => setSearch("")}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {selectedItems.length > 0 ? (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Selected items ({selectedItems.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedItems.map((item) => (
              <Badge key={item.value} variant="secondary" className="gap-1 pr-1">
                <span className="max-w-[220px] truncate">{item.label}</span>
                <button
                  type="button"
                  className="rounded-full p-0.5 hover:bg-background/70"
                  aria-label={`Remove ${item.label}`}
                  disabled={disabled}
                  onClick={() => toggle(item)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-muted-foreground">
            {query
              ? `${visibleItems.length} search result${visibleItems.length === 1 ? "" : "s"}`
              : activeCategory
                ? `${activeCategory.label}${subcategory === "all" ? "" : ` · ${getCatalogSubcategory(category, subcategory)?.label ?? ""}`}`
                : "Choose a category"}
          </p>
          <p className="text-xs text-muted-foreground">Select one or more</p>
        </div>

        {visibleItems.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {query ? `No items match “${query}”.` : "No items in this category."}
          </div>
        ) : query ? (
          <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {visibleItems.map((item) => (
              <ItemRow
                key={item.value}
                item={item}
                checked={selectedSet.has(item.value)}
                disabled={disabled}
                onToggle={() => toggle(item)}
                idPrefix={idPrefix}
              />
            ))}
          </div>
        ) : (
          <div className="max-h-[360px] space-y-4 overflow-y-auto pr-1">
            {activeCategory?.subcategories
              .filter((entry) => subcategory === "all" || entry.value === subcategory)
              .map((entry) => (
                <div key={entry.value} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {entry.label}
                    </p>
                  </div>
                  {entry.items.map((item) => (
                    <ItemRow
                      key={item.value}
                      item={item}
                      checked={selectedSet.has(item.value)}
                      disabled={disabled}
                      onToggle={() => toggle(item)}
                      idPrefix={idPrefix}
                    />
                  ))}
                </div>
              ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Each selected item gets its own parcel details. Hazardous goods are shown for reference but cannot be
        quoted online.
        {selectedItems.some((item) => item.custom)
          ? " Use the parcel description to tell us about custom items."
          : ""}
      </p>

      <span className="sr-only">
        {selectedItems.length
          ? selectedItems.map((item) => catalogItemPath(item)).join(", ")
          : "No items selected"}
      </span>
    </div>
  )
}
