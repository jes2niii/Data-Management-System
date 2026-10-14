import { useState, useEffect } from "react"
import { Outlet, useLocation } from "react-router-dom"
import Sidebar from "./Sidebar"
import Header from "./Header"

function isMobileViewport() {
  return typeof window !== "undefined" && window.innerWidth < 768
}

export default function AppLayout() {
  const location = useLocation()
  const [isMobile, setIsMobile] = useState(() => isMobileViewport())
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    // Closed by default on mobile to avoid covering content
    if (isMobileViewport()) return false
    const def = localStorage.getItem("sidebarDefault")
    if (def === "collapsed") return false
    if (def === "expanded") return true
    return true
  })
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "system")
  const darkMode = (() => {
    if (theme === "dark") return true
    if (theme === "light") return false
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  })()

  useEffect(() => {
    const applyTheme = (t) => {
      if (t === "dark") {
        document.documentElement.classList.add("dark")
      } else if (t === "light") {
        document.documentElement.classList.remove("dark")
      } else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
        document.documentElement.classList.toggle("dark", prefersDark)
      }
    }
    applyTheme(theme)
    // Listen to system changes when in system mode
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)")
      const handler = (e) => document.documentElement.classList.toggle("dark", e.matches)
      mq.addEventListener?.("change", handler)
      return () => mq.removeEventListener?.("change", handler)
    }
  }, [theme])

  useEffect(() => {
    localStorage.setItem("theme", theme)
    // Keep legacy darkMode for Header toggle compat
    localStorage.setItem("darkMode", String(darkMode))
  }, [theme, darkMode])

  useEffect(() => {
    const applyAccent = () => {
      const accent = localStorage.getItem("accent") || "default"
      const density = localStorage.getItem("density") || "comfortable"
      const animations = localStorage.getItem("animations") !== "false"
      document.documentElement.setAttribute("data-density", density)
      document.documentElement.setAttribute("data-animations", String(animations))
      // SEATECH default lives in CSS (:root). Only override when user picks another accent.
      // Gold/amber need navy text for contrast; navy/blue tones need white text.
      const map = {
        seatech: { primary: "#130a5c", foreground: "#ffffff", ring: "#130a5c" },
        "seatech-gold": { primary: "#ffcc0a", foreground: "#130a5c", ring: "#ffcc0a" },
        blue: { primary: "#3b82f6", foreground: "#ffffff", ring: "#3b82f6" },
        emerald: { primary: "#10b981", foreground: "#ffffff", ring: "#10b981" },
        violet: { primary: "#8b5cf6", foreground: "#ffffff", ring: "#8b5cf6" },
        rose: { primary: "#f43f5e", foreground: "#ffffff", ring: "#f43f5e" },
        amber: { primary: "#f59e0b", foreground: "#130a5c", ring: "#f59e0b" },
      }
      if (accent !== "default" && map[accent]) {
        document.documentElement.style.setProperty("--primary", map[accent].primary)
        document.documentElement.style.setProperty("--primary-foreground", map[accent].foreground)
        document.documentElement.style.setProperty("--ring", map[accent].ring)
      } else {
        document.documentElement.style.removeProperty("--primary")
        document.documentElement.style.removeProperty("--primary-foreground")
        document.documentElement.style.removeProperty("--ring")
      }
    }
    applyAccent()
    window.addEventListener("personalization-changed", applyAccent)
    window.addEventListener("storage", applyAccent)
    return () => {
      window.removeEventListener("personalization-changed", applyAccent)
      window.removeEventListener("storage", applyAccent)
    }
  }, [])

  const toggleDarkMode = () => {
    setTheme((prev) => {
      if (prev === "dark") return "light"
      if (prev === "light") return "system"
      return "dark"
    })
  }
  const toggleSidebar = () => setSidebarOpen((prev) => !prev)
  const closeSidebar = () => setSidebarOpen(false)

  // Track viewport so drawer behavior follows resize / rotation
  useEffect(() => {
    const onResize = () => setIsMobile(isMobileViewport())
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  // Auto-close drawer on navigation (mobile only)
  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search])

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [isMobile, sidebarOpen])

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[1px] md:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} isMobile={isMobile} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          toggleSidebar={toggleSidebar}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6">
          <div className="mx-auto w-full max-w-[1600px] min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
