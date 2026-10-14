import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Command } from "cmdk"
import api from "@/lib/api"
import { useDebounce } from "@/hooks/useDebounce"
import {
  Search,
  UserCircle,
  Users,
  FileText,
  FileSpreadsheet,
  DollarSign,
  Activity,
  X,
  Clock,
  ChevronRight,
} from "lucide-react"

const GROUPS = [
  { key: "employees", label: "Employees", icon: UserCircle, listRoute: "/employees", route: (it) => `/employees/${it.id}` },
  { key: "users", label: "Users", icon: Users, listRoute: "/users", route: () => "/users" },
  { key: "files", label: "Files", icon: FileText, listRoute: "/files", route: () => "/files" },
  { key: "forms", label: "Forms", icon: FileSpreadsheet, listRoute: "/forms", route: () => "/forms" },
  { key: "bills", label: "Bills", icon: DollarSign, listRoute: "/billing", route: () => "/billing" },
  { key: "activity_logs", label: "Activity Logs", icon: Activity, listRoute: "/activity-logs", route: () => "/activity-logs" },
]

const RECENT_KEY = "global-search-recent"
const MAX_RECENT = 5

function loadRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function itemTitle(group, it) {
  switch (group) {
    case "employees":
      return it.full_name || `${it.first_name || ""} ${it.last_name || ""}`.trim() || it.employee_id || `Employee #${it.id}`
    case "users":
      return it.name || it.username || it.email || `User #${it.id}`
    case "files":
      return it.original_name || it.name || `File #${it.id}`
    case "forms":
      return it.name || `Form #${it.id}`
    case "bills":
      return it.name || it.reference_number || `Bill #${it.id}`
    case "activity_logs":
      return it.description || `${it.module} ${it.action}`
    default:
      return `#${it.id}`
  }
}

function itemSubtitle(group, it) {
  switch (group) {
    case "employees":
      return [it.employee_id, it.position, it.department?.name].filter(Boolean).join(" • ")
    case "users":
      return [it.email, it.role?.name].filter(Boolean).join(" • ")
    case "files":
      return [it.folder?.name, it.file_type?.toUpperCase()].filter(Boolean).join(" • ")
    case "forms":
      return it.description || ""
    case "bills":
      return [it.provider, it.reference_number, it.amount != null ? `₱${Number(it.amount).toLocaleString()}` : null].filter(Boolean).join(" • ")
    case "activity_logs":
      return [it.module, it.action, it.user?.name].filter(Boolean).join(" • ")
    default:
      return ""
  }
}

function Kbd({ children, onClick }) {
  const cls = "inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground"
  if (onClick) {
    return <button type="button" onClick={onClick} className={`${cls} cursor-pointer transition-colors hover:bg-muted/60 hover:text-foreground`} title="Close">{children}</button>
  }
  return <kbd className={cls}>{children}</kbd>
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [recent, setRecent] = useState([])
  const navigate = useNavigate()
  const debounced = useDebounce(query.trim(), 300)

  // Ctrl+K / Cmd+K toggles the palette, Esc closes it.
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === "Escape") {
        setOpen(false)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  // Reset the query and reload recents whenever the palette opens/closes.
  useEffect(() => {
    if (open) setRecent(loadRecent())
    else setQuery("")
  }, [open])

  const enabled = open && debounced.length >= 2
  const { data, isFetching } = useQuery({
    queryKey: ["global-search", debounced],
    queryFn: () => api.get("/search", { params: { keyword: debounced } }).then((r) => r.data?.data || {}),
    enabled,
    staleTime: 30 * 1000,
    retry: false,
  })

  const remember = (entry) => {
    try {
      const next = [entry, ...loadRecent().filter((r) => r.route !== entry.route)].slice(0, MAX_RECENT)
      localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    } catch {
      // storage unavailable — recents simply won't persist
    }
  }

  const go = (to, recentEntry) => {
    if (recentEntry) remember(recentEntry)
    setOpen(false)
    setQuery("")
    navigate(to)
  }

  const clearRecent = () => {
    try {
      localStorage.removeItem(RECENT_KEY)
    } catch {
      // ignore
    }
    setRecent([])
  }

  const totalResults = enabled && data ? GROUPS.reduce((n, g) => n + (data[g.key]?.length || 0), 0) : 0
  const showRecent = !enabled && recent.length > 0

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex h-9 w-full max-w-md items-center gap-2 rounded-full border border-input bg-background py-0 pl-3 pr-2 text-sm text-muted-foreground shadow-sm transition-all hover:border-primary/40 hover:shadow hover:text-foreground sm:gap-2.5 sm:pl-3.5"
      >
        <Search className="h-4 w-4 shrink-0 transition-colors group-hover:text-primary" />
        <span className="flex-1 truncate text-left text-[13px] sm:text-sm"><span className="sm:hidden">Search…</span><span className="hidden sm:inline">Search employees, files, bills…</span></span>
        <kbd className="hidden shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-1 text-[10px] font-semibold sm:inline-flex">
          Ctrl K
        </kbd>
      </button>

      {open && (
        <div
          className="seatech-modal-overlay fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0b0533]/60 p-2 pt-[8vh] backdrop-blur-sm sm:p-4 sm:pt-[10vh]"
          onClick={() => setOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="seatech-modal-panel w-full max-w-xl">
            <Command
              shouldFilter={false}
              className="overflow-hidden rounded-2xl border border-white/10 bg-popover text-popover-foreground shadow-2xl"
            >
              <div className="h-1 w-full bg-gradient-to-r from-[#130a5c] via-[#ffcc0a] to-[#130a5c]" />

              <div className="flex items-center gap-2.5 border-b px-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Search className="h-4 w-4 text-primary" />
                </span>
                <Command.Input
                  autoFocus
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Search employees, users, files, forms, bills…"
                  className="h-14 w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/70"
                />
                {isFetching ? (
                  <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <Kbd onClick={() => setOpen(false)}>esc</Kbd>
                )}
              </div>

              <Command.List className="max-h-[52vh] overflow-y-auto p-2.5">
                {!enabled && !showRecent && (
                  <div className="flex flex-col items-center px-3 py-10 text-center">
                    <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                      <Search className="h-5 w-5 text-primary" />
                    </span>
                    <p className="text-sm font-semibold">Search across the system</p>
                    <p className="mt-1 max-w-[300px] text-xs leading-relaxed text-muted-foreground">
                      Type at least 2 characters to search employees, users, files, forms, bills, and activity logs.
                    </p>
                  </div>
                )}

                {showRecent && (
                  <Command.Group
                    heading="Recent"
                    className="px-1 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground [&_[cmdk-group-heading]]:flex [&_[cmdk-group-heading]]:items-center [&_[cmdk-group-heading]]:justify-between [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-2"
                  >
                    {recent.map((r) => {
                      const g = GROUPS.find((x) => x.key === r.group)
                      const Icon = g?.icon || Clock
                      return (
                        <Command.Item
                          key={`recent-${r.route}`}
                          value={`recent-${r.route}`}
                          onSelect={() => go(r.route)}
                          className="group flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm aria-selected:bg-accent aria-selected:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{r.title}</span>
                            {r.sub && <span className="block truncate text-xs text-muted-foreground">{r.sub}</span>}
                          </span>
                          <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                        </Command.Item>
                      )
                    })}
                    <button
                      type="button"
                      onClick={clearRecent}
                      className="mt-1 w-full rounded-lg px-2.5 py-1.5 text-center text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      Clear recent searches
                    </button>
                  </Command.Group>
                )}

                {enabled && !isFetching && totalResults === 0 && (
                  <div className="flex flex-col items-center px-3 py-10 text-center">
                    <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-muted">
                      <Search className="h-5 w-5 text-muted-foreground" />
                    </span>
                    <p className="text-sm font-semibold">No results for “{debounced}”</p>
                    <p className="mt-1 max-w-[300px] text-xs leading-relaxed text-muted-foreground">
                      Try a different spelling, an ID number, or fewer characters.
                    </p>
                  </div>
                )}

                {enabled &&
                  GROUPS.map((g) => {
                    const items = (data?.[g.key] || []).slice(0, 6)
                    if (items.length === 0) return null
                    const Icon = g.icon
                    return (
                      <Command.Group
                        key={g.key}
                        heading={`${g.label} · ${data[g.key].length}`}
                        className="px-1 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-2"
                      >
                        {items.map((it) => {
                          const title = itemTitle(g.key, it)
                          const sub = itemSubtitle(g.key, it)
                          const to = g.route(it)
                          return (
                            <Command.Item
                              key={`${g.key}-${it.id}`}
                              value={`${g.key}-${it.id}`}
                              onSelect={() => go(to, { group: g.key, title, sub, route: to })}
                              className="group flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm aria-selected:bg-accent aria-selected:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Icon className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">{title}</span>
                                {sub && <span className="block truncate text-xs text-muted-foreground">{sub}</span>}
                              </span>
                              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-aria-selected:translate-x-0.5 group-aria-selected:text-primary" />
                            </Command.Item>
                          )
                        })}
                        <button
                          type="button"
                          onClick={() => go(g.listRoute)}
                          className="mt-0.5 flex w-full items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                        >
                          View all in {g.label} <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </Command.Group>
                    )
                  })}
              </Command.List>

              <div className="flex items-center justify-between gap-3 border-t bg-muted/40 px-4 py-2.5 text-[11px] text-muted-foreground">
                <span className="min-w-0 truncate">
                  {enabled ? (
                    isFetching ? "Searching…" : totalResults > 0 ? `${totalResults} result${totalResults !== 1 ? "s" : ""}` : "No results"
                  ) : (
                    "Global search"
                  )}
                </span>
                <span className="hidden shrink-0 items-center gap-3 sm:flex">
                  <span className="inline-flex items-center gap-1"><Kbd>↑↓</Kbd> navigate</span>
                  <span className="inline-flex items-center gap-1"><Kbd>↵</Kbd> open</span>
                  <span className="inline-flex items-center gap-1"><Kbd>esc</Kbd> close</span>
                </span>
              </div>
            </Command>
          </div>
        </div>
      )}
    </>
  )
}
