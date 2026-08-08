import { createContext, useContext, useState, useEffect, useCallback } from "react"
import api from "@/lib/api"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    const storedUser = localStorage.getItem("user")
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem("user")
        localStorage.removeItem("access_token")
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email, password) => {
    const response = await api.post("/login", { email, password })
    const { token, user } = response.data.data
    localStorage.setItem("access_token", token)
    localStorage.setItem("user", JSON.stringify(user))
    setUser(user)
    window.location.href = "/dashboard"
  }, [])

  const logout = useCallback(() => {
    api.post("/logout").catch(() => {})
    localStorage.removeItem("access_token")
    localStorage.removeItem("user")
    setUser(null)
    window.location.href = "/login"
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
