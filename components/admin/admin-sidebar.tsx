"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Users,
  Truck,
  ClipboardList,
  LifeBuoy,
  Shield,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Customers", href: "/admin/customers", icon: Users },
  { name: "Providers", href: "/admin/providers", icon: Truck },
  { name: "Applications", href: "/admin/applications", icon: ClipboardList },
  { name: "Support", href: "/admin/support", icon: LifeBuoy },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r">
      <div className="flex items-center gap-2 p-6 border-b">
        <div className="bg-accent rounded-lg p-2">
          <Shield className="h-6 w-6 text-accent-foreground" />
        </div>
        <div>
          <h2 className="font-semibold">Admin Panel</h2>
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
