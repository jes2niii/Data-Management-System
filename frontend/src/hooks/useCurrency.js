import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { hasPermission } from "@/lib/access"

const currencySymbols = {
  USD: "$",
  PHP: "₱",
  EUR: "\u20AC",
  GBP: "\u00A3",
  JPY: "\u00A5",
  INR: "\u20B9",
  CNY: "\u00A5",
  AUD: "A$",
  CAD: "C$",
}

export function useCurrency() {
  const { user } = useAuth()
  const canRead = hasPermission(user, "settings.read")
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get("/settings").then((r) => r.data),
    enabled: canRead,
    staleTime: 1000 * 60 * 30,
    retry: false,
  })

  const settings = (canRead && data?.data) || {}
  const currency = settings.currency || "PHP"
  const symbol = currencySymbols[currency] || currency

  const format = (amount) => {
    if (amount == null) return `${symbol}0.00`
    return `${symbol}${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
  }

  return { symbol, currency, format }
}
