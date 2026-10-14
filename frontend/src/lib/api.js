import axios from "axios"

function getApiBaseUrl() {
  // Explicit override always wins (e.g., VITE_API_URL=http://192.168.1.10:8000/api)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  // Use Vite proxy (/api -> http://localhost:8000) for BOTH localhost and
  // local network. When you open http://192.168.x.x:5173, the browser hits
  // the Vite dev server (listening on 0.0.0.0), which proxies /api to
  // localhost:8000 on the host machine. This works even when backend
  // only listens on 127.0.0.1:8000 (default `php artisan serve`).
  // Direct http://192.168.x.x:8000/api only works if backend runs with
  // `php artisan serve --host 0.0.0.0`, so don't force it.
  return "/api"
}

// Resolve file URLs returned by backend (e.g., http://localhost:8000/storage/...)
// to go via Vite proxy (/storage -> http://localhost:8000) so they work on
// both localhost and local network (npm run dev -- --host) without CORS issues.
export function resolveFileUrl(url) {
  if (!url) return url
  try {
    // Relative already (/storage/...) -> use as-is, Vite proxies /storage
    if (url.startsWith("/storage/") || url.startsWith("storage/")) {
      return url.startsWith("/") ? url : `/${url}`
    }
    if (url.startsWith("/")) {
      return url
    }
    const parsed = new URL(url, typeof window !== "undefined" ? window.location.origin : undefined)
    // Convert absolute backend file URLs to relative /storage/... for proxy
    if (parsed.pathname.includes("/storage/")) {
      return parsed.pathname + parsed.search + parsed.hash
    }
    return url
  } catch {
    return url
  }
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
  withCredentials: false,
})

export { getApiBaseUrl }

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token")
      localStorage.removeItem("user")
      window.location.href = "/login"
    }
    if (error.response?.status === 403) {
      const currentPath = window.location.pathname
      if (currentPath !== "/dashboard") {
        window.location.href = "/dashboard"
      }
    }
    return Promise.reject(error)
  }
)

export default api
