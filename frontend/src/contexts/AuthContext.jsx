import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import api from "@/lib/api"
import { canOpenPage } from "@/lib/access"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sessionError, setSessionError] = useState(false)
  const [sessionAttempt, setSessionAttempt] = useState(0)
  const queryClient = useQueryClient()

  const updateUser = useCallback((account) => {
    setUser(account)
  }, [])

  const clearSession = useCallback(() => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("user")
    queryClient.clear()
    setUser(null)
  }, [queryClient])

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    localStorage.removeItem("user") // Old versions cached the full account record.
    if (!token) {
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setSessionError(false)
    api.get("/me", { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) updateUser(data.data.user) })
      .catch((error) => {
        if (controller.signal.aborted) return
        if ([401, 403].includes(error.response?.status)) {
          clearSession()
        } else {
          setSessionError(true)
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })

    return () => controller.abort()
  }, [clearSession, sessionAttempt, updateUser])

  const retrySession = () => setSessionAttempt((value) => value + 1)

  const login = useCallback(async (email, password) => {
    const response = await api.post("/login", { email, password })
    const { token, user } = response.data.data
    localStorage.setItem("access_token", token)
    updateUser(user)
    const preference = localStorage.getItem("defaultPage")
    const page = preference?.match(/^\/([a-z-]+)$/)?.[1]
    window.location.assign(page && canOpenPage(user, page) ? preference : "/dashboard")
  }, [updateUser])

  const logout = useCallback(async () => {
    try {
      await api.post("/logout", null, { timeout: 4000 })
    } catch (error) {
      if (error.response?.status !== 401) toast.error("Signed out on this device, but the server could not end the session.")
    } finally {
      clearSession()
    }
  }, [clearSession])

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, clearSession, loading, sessionError, retrySession, isAuthenticated: !!user }}>
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
