import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { api, type AppSettings } from "@/lib/api"
import { useAuth } from "@/App"

interface SettingsContextValue {
  currency: string
  locale: string
  appSettings: AppSettings
  refreshSettings: () => void
}

const SettingsContext = createContext<SettingsContextValue>({
  currency: "EUR",
  locale: "lt-LT",
  appSettings: { currency: "EUR", locale: "lt-LT" },
  refreshSettings: () => {},
})

export function useSettings() {
  return useContext(SettingsContext)
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [appSettings, setAppSettings] = useState<AppSettings>({ currency: "EUR", locale: "lt-LT" })

  function load() {
    api.settings.get().then(setAppSettings).catch(() => {})
  }

  useEffect(load, [])

  const currency = user.currency || appSettings.currency || "EUR"
  const locale = user.locale || appSettings.locale || "lt-LT"

  return (
    <SettingsContext.Provider value={{ currency, locale, appSettings, refreshSettings: load }}>
      {children}
    </SettingsContext.Provider>
  )
}
