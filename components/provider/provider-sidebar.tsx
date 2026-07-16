"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Package, MapPin, DollarSign, Settings, User, Truck, BarChart3, Bell } from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/provider", icon: LayoutDashboard },
  { name: "Active Deliveries", href: "/provider/deliveries", icon: Package },
  { name: "Route Planning", href: "/provider/routes", icon: MapPin },
  { name: "Earnings", href: "/provider/earnings", icon: DollarSign },
  { name: "Analytics", href: "/provider/analytics", icon: BarChart3 },
  { name: "Notifications", href: "/provider/notifications", icon: Bell },
  { name: "Profile", href: "/provider/profile", icon: User },
  { name: "Settings", href: "/provider/settings", icon: Settings },
]

export function ProviderSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r">
      <div className="flex items-center gap-2 p-6 border-b">
        <div className="bg-accent rounded-lg p-2">
          <Truck className="h-6 w-6 text-accent-foreground" />
        </div>
        <div>
          <h2 className="font-semibold">Provider Portal</h2>
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
