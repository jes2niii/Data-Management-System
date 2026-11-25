export function hasPermission(user, permission) {
  if (!user) return false
  if (!permission || user.role?.name === "Super Admin") return true
  const permissions = user.permissions || user.role?.permissions || []
  return permissions.some((entry) => (entry?.name || entry) === permission)
}

export const pagePermissions = {
  dashboard: null,
  users: "users.read",
  employees: "employees.read",
  departments: "departments.read",
  files: "documents.read",
  forms: "forms.read",
  billing: "bills.read",
  "activity-logs": "activity_logs.read",
  reports: "reports.read",
  notifications: null,
  profile: null,
  roles: "roles.read",
  items: "items.read",
  attendance: "employees.read",
  training: "training_monitorings.read",
  inventory: "inventory.read",
  books: "book_inventories.read",
}

const reportSources = ["employees", "documents", "bills", "activity_logs"]

export function canOpenPage(user, page) {
  return Object.hasOwn(pagePermissions, page) && hasPermission(user, pagePermissions[page]) &&
    (page !== "reports" || reportSources.some((source) => hasPermission(user, `${source}.read`)))
}

const settingsPermissions = {
  general: ["settings.read"],
  personalization: [],
  email: ["settings.read"],
  categories: ["settings.read"],
  trainings: ["trainings.read"],
  roles: ["roles.read"],
  reset: [],
}

export function settingsTabFor(user, requestedTab) {
  const tab = requestedTab === "training-details" ? "trainings" : requestedTab
  return tab || (hasPermission(user, "settings.read") ? "general" : "personalization")
}

export function canOpenSettingsTab(user, tab) {
  return Boolean(user) && Object.hasOwn(settingsPermissions, tab) &&
    settingsPermissions[tab].every((permission) => hasPermission(user, permission))
}

/** Dashboard widgets are chosen by permissions, never by hardcoded role names. */
export function dashboardSections(user) {
  return {
    employees: hasPermission(user, "employees.read"),
    users: hasPermission(user, "users.read"),
    documents: hasPermission(user, "documents.read"),
    bills: hasPermission(user, "bills.read"),
    training: hasPermission(user, "training_monitorings.read"),
    inventory: hasPermission(user, "inventory.read"),
    activityLogs: hasPermission(user, "activity_logs.read"),
    storage: hasPermission(user, "documents.read")
      || hasPermission(user, "book_inventories.read")
      || hasPermission(user, "employees.read")
      || hasPermission(user, "bills.read"),
  }
}
