export function formatTimeZone(date: Date) {
	const y = date.getFullYear()
	const m = date.getMonth() + 1
	const d = date.getDate()

	return new Date(y, m - 1, d, 12, 0, 0)
}