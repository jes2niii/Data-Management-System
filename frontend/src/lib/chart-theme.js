// Shared Recharts theme — SEATECH navy + gold
// Fixes invisible hover: previously used `hsl(var(--popover))` which is invalid
// because --popover is an oklch()/hex value, not HSL channels. That made the
// tooltip background transparent so text sat directly on the bar color.

export const SEATECH_PALETTE = [
  "#130a5c",
  "#eab308",
  "#0e9f8a",
  "#3b82f6",
  "#f97316",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
]

export const chartTooltipContentStyle = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  color: "var(--popover-foreground)",
  fontSize: "12px",
  boxShadow: "0 8px 24px rgba(19, 10, 92, 0.18)",
}

export const chartTooltipLabelStyle = {
  color: "var(--popover-foreground)",
  fontWeight: 600,
  marginBottom: "4px",
}

export const chartTooltipItemStyle = {
  color: "var(--popover-foreground)",
}

// Hover band behind bars — uses theme muted (navy tint in light, navy in dark)
// so it never matches the bar fill.
export const chartBarCursor = {
  fill: "var(--muted)",
  fillOpacity: 0.55,
}

// Vertical hover line for LineCharts — gold in light, gold in dark.
export const chartLineCursor = {
  stroke: "var(--chart-2)",
  strokeWidth: 1,
  strokeDasharray: "4 4",
}

export const chartTickStyle = {
  fill: "var(--muted-foreground)",
  fontSize: 12,
}
