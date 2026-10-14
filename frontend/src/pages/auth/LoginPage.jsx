import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useBranding } from "@/hooks/useBranding"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, Anchor } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { companyName = "SEATECH", logoUrl = null } = useBranding()
  const isSeatech = String(companyName || "SEATECH").trim().toUpperCase() === "SEATECH"

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!email || !password) {
      setError("Please fill in all fields.")
      return
    }

    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="seatech-hero-bg flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="seatech-card-glow w-full max-w-md overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#130a5c] via-[#ffcc0a] to-[#130a5c]" />
        <CardHeader className="space-y-1 text-center">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${companyName} logo`}
              className="mx-auto mb-2 h-24 w-auto max-w-[260px] rounded-xl bg-white object-contain p-2 shadow-lg ring-2 ring-[#ffcc0a]/70"
            />
          ) : (
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#130a5c] shadow-lg ring-2 ring-[#ffcc0a]/70">
              <Anchor className="h-7 w-7 text-[#ffcc0a]" />
            </div>
          )}
          {(!logoUrl || !isSeatech) && (
            <div className="break-words text-xl font-black tracking-wide text-[#130a5c] dark:text-[#ffcc0a]">
              {isSeatech ? (<>SEA<span className="text-[#cda200] dark:text-white">TECH</span></>) : companyName}
            </div>
          )}
          <p className="text-[11px] font-medium tracking-wider text-muted-foreground">
            Maritime Training & Assessment Center, Inc.
          </p>
          <CardTitle className="pt-2 text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>Enter your credentials to access the system</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
