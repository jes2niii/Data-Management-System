import { z } from "zod"

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(255),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().max(20, "Use at most 20 characters").optional(),
})

export const passwordSchema = z.object({
  current_password: z.string().min(1, "Current password is required"),
  new_password: z.string().min(12, "Must be at least 12 characters")
    .refine((value) => new TextEncoder().encode(value).length <= 72, "Must be no more than 72 bytes"),
  confirm_password: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
})
