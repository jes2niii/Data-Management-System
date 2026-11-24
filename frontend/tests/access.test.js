import { test } from "node:test"
import assert from "node:assert/strict"
import { canOpenPage, canOpenSettingsTab, hasPermission, settingsTabFor } from "../src/lib/access.js"

const account = (permissions, name = "Custom") => ({
  role: { name, permissions: permissions.map((permission) => ({ name: permission })) },
})

test("limited accounts receive only allowed module navigation", () => {
  const user = account(["forms.read"])
  assert.equal(canOpenPage(user, "forms"), true)
  assert.equal(canOpenPage(user, "users"), false)
  assert.equal(canOpenPage(user, "departments"), false)
  assert.equal(canOpenPage(account(["departments.read"]), "departments"), true)
  assert.equal(canOpenPage(user, "dashboard"), true)
  assert.equal(canOpenPage(null, "dashboard"), false)
})

test("reports require both general and source read permissions", () => {
  assert.equal(canOpenPage(account(["reports.read"]), "reports"), false)
  assert.equal(canOpenPage(account(["bills.read"]), "reports"), false)
  assert.equal(canOpenPage(account(["reports.read", "bills.read"]), "reports"), true)
})

test("settings uses an accessible default and preserves the training alias", () => {
  const user = account(["trainings.read"])
  assert.equal(settingsTabFor(user, null), "personalization")
  assert.equal(settingsTabFor(user, "training-details"), "trainings")
  assert.equal(canOpenSettingsTab(user, "trainings"), true)
  assert.equal(canOpenSettingsTab(user, "email"), false)
  assert.equal(canOpenSettingsTab(user, "personalization"), true)
  assert.equal(settingsTabFor(account(["settings.read"]), null), "general")
})

test("Super Admin can open existing modules, not unregistered pages", () => {
  const user = account([], "Super Admin")
  assert.equal(hasPermission(user, "users.read"), true)
  assert.equal(canOpenPage(user, "reports"), true)
  assert.equal(canOpenPage(user, "unknown"), false)
  assert.equal(canOpenSettingsTab(user, "unknown"), false)
})
