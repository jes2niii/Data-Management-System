import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { getTranslation, getLanguage, setLanguage as setLangStorage, initLanguage } from "@/lib/i18n"

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => initLanguage())

  useEffect(() => {
    const handler = () => {
      const newLang = getLanguage()
      setLang(newLang)
      document.documentElement.setAttribute("lang", newLang)
    }
    window.addEventListener("storage", handler)
    window.addEventListener("language-changed", handler)
    // Also listen for personalization-changed which may include language
    window.addEventListener("personalization-changed", handler)
    return () => {
      window.removeEventListener("storage", handler)
      window.removeEventListener("language-changed", handler)
      window.removeEventListener("personalization-changed", handler)
    }
  }, [])

  const t = useCallback((key) => getTranslation(lang, key), [lang])

  const changeLanguage = useCallback((newLang) => {
    setLangStorage(newLang)
    setLang(newLang)
  }, [])

  return (
    <LanguageContext.Provider value={{ lang, t, changeLanguage, setLanguage: changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider")
  return ctx
}

export function useTranslation() {
  const { t } = useLanguage()
  return t
}
