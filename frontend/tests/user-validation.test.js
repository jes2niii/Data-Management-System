import { test } from "node:test"
import assert from "node:assert/strict"
import { userSchema } from "../src/lib/user-validation.js"

const editPayload = {
  name: "Existing User",
  username: "existing",
  email: "existing@example.test",
  password: "",
  role_id: "2",
  department_id: "3",
  position: "",
  phone: "",
  address: "",
  gender: "",
  status: "active",
}

test("editing a user validates with a blank hidden password and blank position", () => {
  assert.equal(userSchema.safeParse(editPayload).success, true)
})

test("a short non-empty password and invalid email are still rejected", () => {
  const short = userSchema.safeParse({ ...editPayload, password: "short" })
  assert.equal(short.success, false)
  assert.match(short.error.issues[0].message, /at least 6/)

  const badEmail = userSchema.safeParse({ ...editPayload, email: "not-an-email" })
  assert.equal(badEmail.success, false)
})
