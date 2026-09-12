import { useState, useEffect } from "react"
import { Outlet } from "react-router-dom"
import Sidebar from "./Sidebar"
import Header from "./Header"

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
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
    const accent = localStorage.getItem("accent") || "default"
    const density = localStorage.getItem("density") || "comfortable"
    const animations = localStorage.getItem("animations") !== "false"
    document.documentElement.setAttribute("data-density", density)
    document.documentElement.setAttribute("data-animations", String(animations))
    // Accent is handled via CSS variable in PersonalizationSection; keep for persistence
    if (accent !== "default") {
      const map = { blue: "#3b82f6", emerald: "#10b981", violet: "#8b5cf6", rose: "#f43f5e", amber: "#f59e0b" }
      if (map[accent]) document.documentElement.style.setProperty("--primary", map[accent])
    } else {
      document.documentElement.style.removeProperty("--primary")
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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={sidebarOpen} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          toggleSidebar={toggleSidebar}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
        />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
