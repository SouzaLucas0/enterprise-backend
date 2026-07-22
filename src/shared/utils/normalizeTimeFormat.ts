export function normalizeTimeFormat(time: string): string {
	const parts = time.split(':')
	if (parts.length === 3) {
		return `${parts[0]}:${parts[1]}`
	}
	return time
}
