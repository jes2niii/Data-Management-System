import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"

function backendOrigin() {
  const base = import.meta.env.VITE_API_URL || ""
  const m = String(base).match(/^(https?:\/\/[^/]+)/i)
  if (m) return m[1]
  // Dev: use relative URLs so Vite proxies /storage -> localhost:8000.
  // Hardcoding http://localhost:8000 breaks local network
  // (npm run dev -- --host) because phones try localhost on themselves.
  if (import.meta.env.DEV) return ""
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin
  return ""
}

/**
 * Turns a stored logo value into a loadable URL.
 * Accepts: full http(s) URL, blob:/data: preview, "/storage/..." path,
 * "storage/..." path, or raw "logos/xxx.jpg" disk path.
 */
export function resolveStorageUrl(pathOrUrl) {
  if (!pathOrUrl) return null
  const v = String(pathOrUrl)
  if (/^(blob:|data:)/i.test(v)) return v
  // Absolute URL containing /storage/ -> convert to relative so Vite proxy handles it
  // (fixes localhost hardcode breaking 192.168.x.x access)
  if (/^https?:/i.test(v)) {
    try {
      const parsed = new URL(v)
      if (parsed.pathname.includes("/storage/")) {
        return parsed.pathname + parsed.search + parsed.hash
      }
    } catch {
      // fall through
    }
    return v
  }
  const normalized = v.startsWith("/storage/")
    ? v
    : v.startsWith("storage/")
      ? `/${v}`
      : `/storage/${v.replace(/^\//, "")}`
  return `${backendOrigin()}${normalized}`
}

export function useBranding() {
  const query = useQuery({
    queryKey: ["branding"],
    queryFn: () => api.get("/branding").then((r) => r.data?.data || r.data || {}),
    staleTime: 1000 * 60 * 10,
    retry: false,
    refetchOnWindowFocus: false,
  })

  // Re-apply instantly after a logo upload in Settings (same tab).
  useEffect(() => {
    const handler = () => query.refetch()
    window.addEventListener("branding-changed", handler)
    return () => window.removeEventListener("branding-changed", handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const data = query.data || {}
  const companyName = data.company_name || "SEATECH"
  const logoUrl = resolveStorageUrl(data.company_logo_url || data.company_logo)

  // Apply logo as favicon + company name as title.
  useEffect(() => {
    document.title = `${companyName} — Data Management System`
    if (logoUrl && !logoUrl.startsWith("blob:")) {
      let link = document.querySelector("link[rel='icon']")
      if (!link) {
        link = document.createElement("link")
        link.rel = "icon"
        document.head.appendChild(link)
      }
      if (link.getAttribute("href") !== logoUrl) link.setAttribute("href", logoUrl)
    }
  }, [companyName, logoUrl])

  return { ...query, companyName, logoUrl }
}
