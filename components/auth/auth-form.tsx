"use client"

import type React from "react"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Truck, User } from "lucide-react"

export function AuthForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [accountType, setAccountType] = useState("customer")
  const [message, setMessage] = useState<string | null>(null)

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    const result = await signIn("email", {
      email,
      redirect: false,
      callbackUrl: accountType === "provider" ? "/provider" : "/customer",
    })

    setIsLoading(false)

    if (result?.error) {
      setMessage("Unable to send sign-in link. Check that your email is correct.")
      return
    }

    setMessage("A magic link has been sent to your email. Check your inbox to continue.")
  }

  const handleProviderSignIn = (provider: "google" | "github") => {
    setIsLoading(true)
    void signIn(provider, {
      callbackUrl: accountType === "provider" ? "/provider" : "/customer",
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-accent rounded-full p-3">
              <Truck className="h-8 w-8 text-accent-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-primary-foreground mb-2">LogiConnect</h1>
          <p className="text-primary-foreground/80">Your logistics platform</p>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Welcome</CardTitle>
            <CardDescription className="text-center">Sign in to your account or create a new one</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-4">
                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      placeholder="Enter your email"
                      required
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Sending link..." : "Send Sign-In Link"}
                  </Button>
                </form>
                <div className="space-y-3 pt-2">
                  <Button type="button" className="w-full" onClick={() => handleProviderSignIn("google")}>
                    Continue with Google
                  </Button>
                  <Button type="button" variant="outline" className="w-full" onClick={() => handleProviderSignIn("github")}>
                    Continue with GitHub
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="userType">Account Type</Label>
                    <Select value={accountType} onValueChange={(value) => setAccountType(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Customer
                          </div>
                        </SelectItem>
                        <SelectItem value="provider">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            Delivery Provider
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      placeholder="Enter your email"
                      required
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Sending link..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            
            {message ? <p className="text-sm text-primary-foreground">{message}</p> : null}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
