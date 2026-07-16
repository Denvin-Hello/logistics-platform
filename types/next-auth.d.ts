import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: DefaultSession["user"] & {
      id: string
      role: "CUSTOMER" | "PROVIDER" | "ADMIN"
    }
  }

  interface User {
    role: "CUSTOMER" | "PROVIDER" | "ADMIN"
  }
}
