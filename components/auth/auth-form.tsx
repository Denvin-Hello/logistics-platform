"use client"

import type React from "react"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Truck, User } from "lucide-react"

export function AuthForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [providerName, setProviderName] = useState("")
  const [providerBusinessName, setProviderBusinessName] = useState("")
  const [signupMode, setSignupMode] = useState<"customer" | "provider">("customer")
  const [message, setMessage] = useState<string | null>(null)

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    const result = await signIn("email", {
      email,
      redirect: false,
      callbackUrl: signupMode === "provider" ? "/provider" : "/customer",
    })

    setIsLoading(false)

    if (result?.error) {
      setMessage("Unable to send sign-in link. Check that your email is correct.")
      return
    }

    setMessage("A magic link has been sent to your email. Check your inbox to continue.")
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    const formEmail = email.trim()
    const currentMode = signupMode

    if (!formEmail) {
      setMessage("Please enter your email address.")
      setIsLoading(false)
      return
    }

    if (currentMode === "customer" && !customerName.trim()) {
      setMessage("Please enter your full name.")
      setIsLoading(false)
      return
    }

    if (currentMode === "provider" && (!providerName.trim() || !providerBusinessName.trim())) {
      setMessage("Please enter your name and business name.")
      setIsLoading(false)
      return
    }

    const signupRes = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formEmail,
        name: currentMode === "customer" ? customerName : providerName,
        role: currentMode,
        businessName: currentMode === "provider" ? providerBusinessName : undefined,
      }),
    })

    const signupData = await signupRes.json()

    if (!signupRes.ok) {
      setMessage(signupData.error || "Unable to create your account. Check that your email is correct.")
      setIsLoading(false)
      return
    }

    const result = await signIn("email", {
      email: formEmail,
      redirect: false,
      callbackUrl: currentMode === "provider" ? "/provider" : "/customer",
    })

    setIsLoading(false)

    if (result?.error) {
      setMessage("Unable to send the sign-in link. Check that your email is correct.")
      return
    }

    setMessage(
      currentMode === "provider"
        ? "Your provider application has been submitted for review. Check your email for the sign-in link."
        : "Your customer account setup request has been sent. Check your email to continue.",
    )
  }

  const handleProviderSignIn = (provider: "google" | "github") => {
    setIsLoading(true)
    void signIn(provider, {
      callbackUrl: signupMode === "provider" ? "/provider" : "/customer",
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-4">
      <div className="w-full max-w-lg">
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
                <form onSubmit={handleEmailSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label>I want to sign up as</Label>
                    <RadioGroup
                      value={signupMode}
                      onValueChange={(value) => setSignupMode(value as "customer" | "provider")}
                      className="grid grid-cols-2 gap-2"
                    >
                      <label
                        htmlFor="role-customer"
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium transition-colors ${
                          signupMode === "customer"
                            ? "border-primary bg-accent/10 text-primary"
                            : "border-input hover:bg-accent/5"
                        }`}
                      >
                        <RadioGroupItem value="customer" id="role-customer" />
                        <User className="h-4 w-4" />
                        Customer
                      </label>
                      <label
                        htmlFor="role-provider"
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium transition-colors ${
                          signupMode === "provider"
                            ? "border-primary bg-accent/10 text-primary"
                            : "border-input hover:bg-accent/5"
                        }`}
                      >
                        <RadioGroupItem value="provider" id="role-provider" />
                        <Truck className="h-4 w-4" />
                        Provider
                      </label>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-name">
                      {signupMode === "provider" ? "Your Name" : "Full Name"}
                    </Label>
                    <Input
                      id="signup-name"
                      type="text"
                      value={signupMode === "provider" ? providerName : customerName}
                      placeholder={signupMode === "provider" ? "Your full name" : "Your full name"}
                      required
                      onChange={(e) =>
                        signupMode === "provider"
                          ? setProviderName(e.target.value)
                          : setCustomerName(e.target.value)
                      }
                    />
                  </div>

                  {signupMode === "provider" ? (
                    <div className="space-y-2">
                      <Label htmlFor="signup-business-name">Business Name</Label>
                      <Input
                        id="signup-business-name"
                        type="text"
                        value={providerBusinessName}
                        placeholder="Business or fleet name"
                        required
                        onChange={(e) => setProviderBusinessName(e.target.value)}
                      />
                    </div>
                  ) : null}

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
                    {isLoading
                      ? "Sending link..."
                      : signupMode === "provider"
                        ? "Create Provider Account"
                        : "Create Customer Account"}
                  </Button>
                </form>
              </TabsContent>

              {message ? <p className="mt-4 text-sm text-primary-foreground">{message}</p> : null}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
