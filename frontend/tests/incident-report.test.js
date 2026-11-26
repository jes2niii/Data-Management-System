import { test } from "node:test"
import assert from "node:assert/strict"
import { incidentReportSchema } from "../src/lib/incident-report-validation.js"
import { buildIncidentReportHtml, escapeHtml } from "../src/lib/incident-report-print.js"
import { formatIncidentDate } from "../src/lib/incident-report-format.js"

const valid = {
  filer_name: "Juan Dela Cruz",
  date_reported: "2026-11-26",
  item: "Office laptop",
  property_code: "IT-001",
  incident_type: "Lost",
  date_of_incident: "2026-11-25",
  place_of_incident: "Room 101",
  detailed_narration: "Laptop was missing after the meeting.",
  remarks: "",
  jo_number: "",
  notes: "",
}

test("incident report schema accepts a complete valid report", () => {
  assert.equal(incidentReportSchema.safeParse(valid).success, true)
})

test("incident report schema rejects missing fields and invalid type", () => {
  const missing = incidentReportSchema.safeParse({ ...valid, filer_name: "", detailed_narration: "" })
  assert.equal(missing.success, false)
  assert.ok(missing.error.issues.some((issue) => issue.path[0] === "filer_name"))

  const badType = incidentReportSchema.safeParse({ ...valid, incident_type: "Missing" })
  assert.equal(badType.success, false)
  assert.ok(badType.error.issues.some((issue) => issue.path[0] === "incident_type"))
})

test("incident report schema blocks incident date after reported date", () => {
  const result = incidentReportSchema.safeParse({ ...valid, date_of_incident: "2026-11-27" })
  assert.equal(result.success, false)
  assert.ok(result.error.issues.some((issue) => issue.path[0] === "date_of_incident"))
})

test("dates are displayed in a friendly format without day shifts", () => {
  assert.equal(formatIncidentDate("2026-11-26"), "Nov 26, 2026")
  assert.equal(formatIncidentDate("2026-11-26T00:00:00.000000Z"), "Nov 26, 2026")
  assert.equal(formatIncidentDate(null), "—")
})

test("print output escapes user text and shows the IR number", () => {
  const html = buildIncidentReportHtml({ ...valid, ir_number: "IR-2026-0001", detailed_narration: "<script>alert(1)</script>" }, "SEATECH")
  assert.match(html, /IR-2026-0001/)
  assert.match(html, /&lt;script&gt;/)
  assert.doesNotMatch(html, /<script>alert/)
  assert.equal(escapeHtml("A & B"), "A &amp; B")
})
