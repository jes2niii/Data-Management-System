import { format, parseISO } from "date-fns"

/** Display dates in a readable form without shifting calendar days by timezone. */
export function formatIncidentDate(value, pattern = "MMM dd, yyyy") {
  if (!value) return "—"
  const dateText = String(value).slice(0, 10)
  try {
    return format(parseISO(dateText), pattern)
  } catch {
    return String(value)
  }
}
