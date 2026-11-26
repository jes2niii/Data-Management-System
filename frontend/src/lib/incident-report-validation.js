import { z } from "zod"

const dateString = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date")

export const incidentReportSchema = z.object({
  filer_name: z.string().trim().min(1, "Filer's name is required").max(255),
  date_reported: dateString,
  item: z.string().trim().min(1, "Item is required").max(255),
  property_code: z.string().trim().max(50, "Use at most 50 characters").optional(),
  incident_type: z.enum(["Lost", "Damaged", "Stolen"]),
  date_of_incident: dateString,
  place_of_incident: z.string().trim().min(1, "Place of incident is required").max(255),
  detailed_narration: z.string().trim().min(1, "Detailed narration is required").max(5000),
  remarks: z.string().trim().max(1000).optional(),
  jo_number: z.string().trim().max(50).optional(),
  notes: z.string().trim().max(1000).optional(),
}).refine((data) => data.date_of_incident <= data.date_reported, {
  message: "Date of incident cannot be later than date reported",
  path: ["date_of_incident"],
})
