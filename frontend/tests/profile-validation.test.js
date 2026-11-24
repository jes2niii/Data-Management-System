import { test } from "node:test"
import assert from "node:assert/strict"
import { zodResolver } from "@hookform/resolvers/zod"
import { passwordSchema, profileSchema } from "../src/lib/profile-validation.js"

const resolve = (schema, data) => zodResolver(schema)(data, {}, { criteriaMode: "firstError" })

test("profile form trims fields, preserves a blank phone, and reports invalid email", async () => {
  const valid = await resolve(profileSchema, { name: " Test Member ", email: " member@example.test ", phone: "" })
  assert.deepEqual(valid.values, { name: "Test Member", email: "member@example.test", phone: "" })
  const invalid = await resolve(profileSchema, { name: "Test Member", email: "invalid" })
  assert.equal(invalid.errors.email.message, "Invalid email")
})

test("password form reports confirmation and byte-limit errors on the correct fields", async () => {
  const password = "test-only-phrase"
  const mismatch = await resolve(passwordSchema, {
    current_password: password, new_password: password, confirm_password: "different-test-value",
  })
  assert.equal(mismatch.errors.confirm_password.message, "Passwords do not match")
  const overLimit = "€".repeat(25)
  const invalid = await resolve(passwordSchema, {
    current_password: password, new_password: overLimit, confirm_password: overLimit,
  })
  assert.equal(invalid.errors.new_password.message, "Must be no more than 72 bytes")
})
