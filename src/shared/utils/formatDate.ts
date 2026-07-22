export function formatDate(dateInput: string | Date): string {
  if (!dateInput) {
    return ''
  }

  const date = dateInput instanceof Date ? dateInput : new Date(`${dateInput}T00:00:00`)

  if (!Number.isNaN(date.getTime())) {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const raw = String(dateInput)
  const isoMatch = raw.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    const [, year, month, day] = isoMatch
    return `${day}/${month}/${year}`
  }

  const brMatch = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (brMatch) {
    const [, day, month, year] = brMatch
    
    return `${day}/${month}/${year}`
  }

  return raw
}
