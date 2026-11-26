import { formatIncidentDate } from "./incident-report-format.js"

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

export function buildIncidentReportHtml(report, companyName = "SEATECH") {
  const field = (label, value) => `
    <tr>
      <th style="text-align:left;padding:6px 8px;border:1px solid #999;background:#f3f4f6;width:28%">${label}</th>
      <td style="padding:6px 8px;border:1px solid #999">${escapeHtml(value) || "&nbsp;"}</td>
    </tr>`

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(report?.ir_number || "Incident Report")}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 32px; }
    h1 { text-align: center; font-size: 20px; margin: 0 0 4px; letter-spacing: 1px; }
    h2 { text-align: center; font-size: 14px; margin: 0 0 18px; font-weight: normal; }
    .ir { text-align: right; font-weight: bold; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .narration { margin-top: 18px; }
    .narration h3 { font-size: 13px; margin: 0 0 6px; }
    .narration p { border: 1px solid #999; padding: 12px; min-height: 90px; margin: 0; white-space: pre-wrap; }
    .signatures { display: flex; gap: 32px; margin-top: 56px; font-size: 12px; }
    .signatures div { flex: 1; border-top: 1px solid #111; padding-top: 6px; }
    @media print { body { margin: 16mm; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(companyName)}</h1>
  <h2>INCIDENT REPORT</h2>
  <div class="ir">${escapeHtml(report?.ir_number)}</div>
  <table>
    ${field("Filer's Name", report?.filer_name)}
    ${field("Date Reported", formatIncidentDate(report?.date_reported))}
    ${field("Item", report?.item)}
    ${field("Property Code", report?.property_code)}
    ${field("Type of Incident", report?.incident_type)}
    ${field("Date of Incident", formatIncidentDate(report?.date_of_incident))}
    ${field("Place of Incident", report?.place_of_incident)}
    ${field("Remarks", report?.remarks)}
    ${field("JO #", report?.jo_number)}
    ${field("Notes", report?.notes)}
  </table>
  <div class="narration">
    <h3>Detailed Narration</h3>
    <p>${escapeHtml(report?.detailed_narration)}</p>
  </div>
  <div class="signatures">
    <div>Prepared by: ${escapeHtml(report?.filer_name)}</div>
    <div>Noted by:</div>
    <div>Received by:</div>
  </div>
</body>
</html>`
}

export function printIncidentReport(report, companyName) {
  const html = buildIncidentReportHtml(report, companyName)
  const win = window.open("", "_blank")
  if (!win) return false
  win.document.open()
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
  return true
}
