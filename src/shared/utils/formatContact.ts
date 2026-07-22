export function formatContact(phone: string): string {
	let digits = phone.replace(/\D/g, '')

	if (digits.startsWith('55')) {
		digits = digits.slice(2)
	}

	const match = digits.match(/^(\d{2})9(\d{8})$/)
	if (match) {
		return match[1] + match[2]
	}

	return digits
}
