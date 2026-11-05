type DateValue = string | Date | null | undefined

function toDate(value: DateValue) {
  if (!value) return null

  const normalizedValue =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? `${value}T12:00:00`
      : typeof value === "string"
        ? value.replace(" ", "T")
        : value
  const date = new Date(normalizedValue)

  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value: DateValue, locale = "es-CO") {
  const date = toDate(value)
  return date ? date.toLocaleDateString(locale) : "Sin fecha"
}

export function toDateInputValue(value: DateValue) {
  if (!value) return ""

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10)
  }

  const date = toDate(value)
  if (!date) return ""

  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

export function getCurrentDateInputValue() {
  return toDateInputValue(new Date())
}
