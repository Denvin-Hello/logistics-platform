"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Package, Plus, MapPin, CreditCard, Settings, User, History, Bell } from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/customer", icon: LayoutDashboard },
  { name: "New Order", href: "/customer/new-order", icon: Plus },
  { name: "My Orders", href: "/customer/orders", icon: Package },
  { name: "Track Package", href: "/customer/tracking", icon: MapPin },
  { name: "Order History", href: "/customer/history", icon: History },
  { name: "Payments", href: "/customer/payments", icon: CreditCard },
  { name: "Notifications", href: "/customer/notifications", icon: Bell },
  { name: "Profile", href: "/customer/profile", icon: User },
  { name: "Settings", href: "/customer/settings", icon: Settings },
]

export function CustomerSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r">
      <div className="flex items-center gap-2 p-6 border-b">
        <div className="bg-accent rounded-lg p-2">
          <Package className="h-6 w-6 text-accent-foreground" />
        </div>
        <div>
          <h2 className="font-semibold">Customer Portal</h2>
          <p className="text-sm text-muted-foreground">LogiConnect</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Button
              key={item.name}
              variant={isActive ? "secondary" : "ghost"}
              className={cn("w-full justify-start gap-3", isActive && "bg-accent text-accent-foreground")}
              asChild
            >
              <Link href={item.href}>
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            </Button>
          )
        })}
      </nav>
    </div>
  )
}
