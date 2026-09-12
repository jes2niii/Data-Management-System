const translations = {
  en: {
    "settings.personalization": "Personalization",
    "settings.appearance": "Appearance",
    "settings.preferences": "Preferences",
    "settings.theme": "Theme",
    "settings.theme.light": "Light",
    "settings.theme.dark": "Dark",
    "settings.theme.system": "System",
    "settings.accent": "Accent Color",
    "settings.language": "Language",
    "settings.language.en": "English",
    "settings.language.fil": "Filipino",
    "settings.language.es": "Español",
    "settings.language.ja": "日本語",
    "settings.save": "Save Personalization",
    "settings.reset": "Reset to Defaults",
    "settings.saved": "Personalization saved — your choices are saved per device, system defaults unchanged",
    "settings.resetSuccess": "Personalization reset to defaults",
    "dashboard.title": "Dashboard",
    "dashboard.overview": "Overview of your data management system",
    "training.monitoring": "Training Monitoring",
    "common.save": "Save",
    "common.cancel": "Cancel",
  },
  fil: {
    "settings.personalization": "Personalisasyon",
    "settings.appearance": "Itsura",
    "settings.preferences": "Mga Kagustuhan",
    "settings.theme": "Tema",
    "settings.theme.light": "Maliwanag",
    "settings.theme.dark": "Madilim",
    "settings.theme.system": "Sistema",
    "settings.accent": "Kulay ng Accent",
    "settings.language": "Wika",
    "settings.language.en": "Ingles",
    "settings.language.fil": "Filipino",
    "settings.language.es": "Espanyol",
    "settings.language.ja": "Hapon",
    "settings.save": "I-save ang Personalisasyon",
    "settings.reset": "Ibalik sa Default",
    "settings.saved": "Na-save ang personalisasyon — naka-save per device, hindi nagbago ang system default",
    "settings.resetSuccess": "Naibalik sa default ang personalisasyon",
    "dashboard.title": "Dashboard",
    "dashboard.overview": "Pangkalahatang-ideya ng iyong sistema",
    "training.monitoring": "Pagsubaybay sa Pagsasanay",
    "common.save": "I-save",
    "common.cancel": "Kanselahin",
  },
  es: {
    "settings.personalization": "Personalización",
    "settings.appearance": "Apariencia",
    "settings.preferences": "Preferencias",
    "settings.theme": "Tema",
    "settings.theme.light": "Claro",
    "settings.theme.dark": "Oscuro",
    "settings.theme.system": "Sistema",
    "settings.accent": "Color de acento",
    "settings.language": "Idioma",
    "settings.language.en": "Inglés",
    "settings.language.fil": "Filipino",
    "settings.language.es": "Español",
    "settings.language.ja": "Japonés",
    "settings.save": "Guardar personalización",
    "settings.reset": "Restablecer valores predeterminados",
    "settings.saved": "Personalización guardada — guardado por dispositivo, valores predeterminados sin cambios",
    "settings.resetSuccess": "Personalización restablecida",
    "dashboard.title": "Panel",
    "dashboard.overview": "Resumen de su sistema",
    "training.monitoring": "Monitoreo de Capacitación",
    "common.save": "Guardar",
    "common.cancel": "Cancelar",
  },
  ja: {
    "settings.personalization": "パーソナライゼーション",
    "settings.appearance": "外観",
    "settings.preferences": "設定",
    "settings.theme": "テーマ",
    "settings.theme.light": "ライト",
    "settings.theme.dark": "ダーク",
    "settings.theme.system": "システム",
    "settings.accent": "アクセントカラー",
    "settings.language": "言語",
    "settings.language.en": "英語",
    "settings.language.fil": "フィリピノ語",
    "settings.language.es": "スペイン語",
    "settings.language.ja": "日本語",
    "settings.save": "パーソナライズを保存",
    "settings.reset": "デフォルトにリセット",
    "settings.saved": "パーソナライズが保存されました — デバイスごとに保存、システムのデフォルトは変更なし",
    "settings.resetSuccess": "デフォルトにリセットしました",
    "dashboard.title": "ダッシュボード",
    "dashboard.overview": "データ管理システムの概要",
    "training.monitoring": "トレーニング監視",
    "common.save": "保存",
    "common.cancel": "キャンセル",
  },
}

export function getTranslation(lang, key) {
  const dict = translations[lang] || translations.en
  return dict[key] || translations.en[key] || key
}

export function getLanguage() {
  try {
    return localStorage.getItem("language") || "en"
  } catch {
    return "en"
  }
}

export function setLanguage(lang) {
  try {
    localStorage.setItem("language", lang)
    document.documentElement.setAttribute("lang", lang)
    window.dispatchEvent(new Event("language-changed"))
  } catch {}
}

export function initLanguage() {
  const lang = getLanguage()
  document.documentElement.setAttribute("lang", lang)
  return lang
}

export const availableLanguages = [
  { value: "en", label: "English" },
  { value: "fil", label: "Filipino" },
  { value: "es", label: "Español" },
  { value: "ja", label: "日本語" },
]

export default translations
