import { CustomerSidebar } from "@/components/customer/customer-sidebar"
import { OrderForm } from "@/components/customer/order-form"
import { CATALOG_ITEMS, getCatalogItem, isCatalogItemBlocked } from "@/lib/package-catalog"

export default function NewOrderPage({
  searchParams,
}: {
  searchParams: { packageType?: string; items?: string }
}) {
  const requestedItems = (searchParams.items || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)

  const initialItemKeys = requestedItems.filter((itemKey) => {
    const item = getCatalogItem(itemKey)
    return !!item && !isCatalogItemBlocked(item)
  })

  if (initialItemKeys.length === 0 && searchParams.packageType) {
    const requested = searchParams.packageType
    const directItem = getCatalogItem(requested)
    if (directItem && !isCatalogItemBlocked(directItem)) {
      initialItemKeys.push(directItem.value)
    } else {
      const legacyMatch = CATALOG_ITEMS.find(
        (item) => item.packageType === requested && !isCatalogItemBlocked(item),
      )
      if (legacyMatch) initialItemKeys.push(legacyMatch.value)
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <CustomerSidebar />
      <div className="flex-1 overflow-auto">
        <OrderForm initialItemKeys={initialItemKeys} />
      </div>
    </div>
  )
}
