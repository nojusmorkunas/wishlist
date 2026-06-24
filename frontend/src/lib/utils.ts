import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: string, locale: string, currency: string): string {
  if (!price) return ""
  const num = parseFloat(price.replace(",", "."))
  if (!isNaN(num)) {
    try {
      return new Intl.NumberFormat(locale || "lt-LT", {
        style: "currency",
        currency: currency || "EUR",
      }).format(num)
    } catch {
      return price
    }
  }
  return price
}

export function daysUntilBirthday(birthday: string): number | null {
  if (!birthday) return null
  const today = new Date()
  const bday = new Date(birthday)
  const next = new Date(today.getFullYear(), bday.getMonth(), bday.getDate())
  if (next < today) next.setFullYear(today.getFullYear() + 1)
  return Math.ceil((next.getTime() - today.getTime()) / 86400000)
}

export function turningAge(birthday: string): number | null {
  if (!birthday) return null
  const today = new Date()
  const bday = new Date(birthday)
  const thisYearBirthday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate())
  const nextYear = thisYearBirthday < today ? today.getFullYear() + 1 : today.getFullYear()
  return nextYear - bday.getFullYear()
}
