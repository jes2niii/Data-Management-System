import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"

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
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get("/settings").then((r) => r.data).catch(() => ({ data: { currency: "PHP" } })),
    staleTime: 1000 * 60 * 30,
    retry: false,
  })

  const settings = data?.data || {}
  const currency = settings.currency || "PHP"
  const symbol = currencySymbols[currency] || currency

  const format = (amount) => {
    if (amount == null) return `${symbol}0.00`
    return `${symbol}${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
  }

  return { symbol, currency, format }
}
