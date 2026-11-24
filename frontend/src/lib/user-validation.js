import { z } from "zod"

// An empty password is valid while editing (the field is hidden and omitted
// from the request); creation still requires at least 6 characters.
export const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().refine((value) => value === "" || value.length >= 6, "Password must be at least 6 characters"),
  role_id: z.string().min(1, "Role is required"),
  department_id: z.string().min(1, "Department is required"),
  position: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  gender: z.string().optional(),
  status: z.string().default("active"),
})
