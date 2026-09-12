import { useState, useEffect } from "react"

export function usePersonalization() {
  const [personalization, setPersonalization] = useState(() => {
    try {
      return {
        theme: localStorage.getItem("theme") || "system",
        accent: localStorage.getItem("accent") || "default",
        sidebarDefault: localStorage.getItem("sidebarDefault") || "expanded",
        density: localStorage.getItem("density") || "comfortable",
        animations: localStorage.getItem("animations") !== "false",
        language: localStorage.getItem("language") || "en",
        defaultPage: localStorage.getItem("defaultPage") || "/dashboard",
        itemsPerPage: parseInt(localStorage.getItem("itemsPerPage") || "10", 10),
        emailNotif: localStorage.getItem("emailNotif") !== "false",
        pushNotif: localStorage.getItem("pushNotif") !== "false",
      }
    } catch {
      return {
        theme: "system",
        accent: "default",
        sidebarDefault: "expanded",
        density: "comfortable",
        animations: true,
        language: "en",
        defaultPage: "/dashboard",
        itemsPerPage: 10,
        emailNotif: true,
        pushNotif: true,
      }
    }
  })

  useEffect(() => {
    const handleStorage = () => {
      setPersonalization({
        theme: localStorage.getItem("theme") || "system",
        accent: localStorage.getItem("accent") || "default",
        sidebarDefault: localStorage.getItem("sidebarDefault") || "expanded",
        density: localStorage.getItem("density") || "comfortable",
        animations: localStorage.getItem("animations") !== "false",
        language: localStorage.getItem("language") || "en",
        defaultPage: localStorage.getItem("defaultPage") || "/dashboard",
        itemsPerPage: parseInt(localStorage.getItem("itemsPerPage") || "10", 10),
        emailNotif: localStorage.getItem("emailNotif") !== "false",
        pushNotif: localStorage.getItem("pushNotif") !== "false",
      })
    }
    window.addEventListener("storage", handleStorage)
    // Also listen for custom event when personalization changes in same tab
    window.addEventListener("personalization-changed", handleStorage)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener("personalization-changed", handleStorage)
    }
  }, [])

  return personalization
}
