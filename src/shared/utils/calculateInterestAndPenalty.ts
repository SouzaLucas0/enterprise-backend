type InterestType = 'S' | 'D' | 'M'

interface InterestAndPenaltyResult {
	interest: number
	penalty: number
	total: number
	daysOverdue: number
}

export function calculateInterestAndPenalty(
	amount: number,
	dueDate: Date,
	dailyInterestRatePercent: number,
	penaltyPercent: number,
	currentDate: Date,
	interestType: InterestType,
): number {
	const due = toDate(dueDate)
	const current = toDate(currentDate)
	const diffTime = current.getTime() - due.getTime()

	const daysOverdue = Math.max(Math.floor(diffTime / (1000 * 60 * 60 * 24)), 0)

	let interest = 0

	if (daysOverdue > 0) {
		const rateDecimal = dailyInterestRatePercent / 100

		switch (interestType) {
			case 'S':
				interest = amount * rateDecimal * daysOverdue
				break

			case 'D':
				interest = amount * (Math.pow(1 + rateDecimal, daysOverdue) - 1)
				break

			case 'M':
				let amountWithInterest = amount
				let remainingDays = daysOverdue

				while (remainingDays > 30) {
					amountWithInterest *= 1 + rateDecimal * 30
					remainingDays -= 30
				}

				if (remainingDays > 0) {
					amountWithInterest *= 1 + rateDecimal * remainingDays
				}

				interest = amountWithInterest - amount
				break

			default:
				interest = amount * rateDecimal * daysOverdue
				break
		}

		interest = Math.trunc(interest * 100) / 100
	}

	const penalty = daysOverdue > 0 ? Math.trunc(amount * (penaltyPercent / 100) * 100) / 100 : 0
	const total = Math.trunc((interest + penalty) * 100) / 100

	return total
}

export function calculateInterest(
	amount: number,
	dueDate: Date | string,
	dailyInterestRatePercent: number,
	currentDate: Date | string,
	interestType: InterestType,
): number {
	const due = toDate(dueDate)
	const current = toDate(currentDate)

	const diffTime = current.getTime() - due.getTime()
	const daysOverdue = Math.max(Math.floor(diffTime / (1000 * 60 * 60 * 24)), 0)

	let interest = 0

	if (daysOverdue > 0) {
		const rateDecimal = dailyInterestRatePercent / 100

		switch (interestType) {
			case 'S':
				interest = amount * rateDecimal * daysOverdue
				break

			case 'D':
				interest = amount * (Math.pow(1 + rateDecimal, daysOverdue) - 1)
				break

			case 'M':
				let amountWithInterest = amount
				let remainingDays = daysOverdue

				while (remainingDays > 30) {
					amountWithInterest *= 1 + rateDecimal * 30
					remainingDays -= 30
				}

				if (remainingDays > 0) {
					amountWithInterest *= 1 + rateDecimal * remainingDays
				}

				interest = amountWithInterest - amount
				break
		}

		interest = Math.trunc(interest * 100) / 100
	}

	return interest
}

export function calculatePenalty(
	amount: number,
	dueDate: Date | string,
	penaltyPercent: number,
	currentDate: Date | string,
): number {
	const due = toDate(dueDate)
	const current = toDate(currentDate)

	const diffTime = current.getTime() - due.getTime()
	const daysOverdue = Math.max(Math.floor(diffTime / (1000 * 60 * 60 * 24)), 0)

	const penalty = daysOverdue > 0 ? Math.trunc(amount * (penaltyPercent / 100) * 100) / 100 : 0

	return penalty
}

function toDate(date: Date | string | number): Date {
	if (date instanceof Date) return date

	const parsed = new Date(date)

	if (isNaN(parsed.getTime())) {
		throw new Error(`Invalid date value: ${date}`)
	}

	return parsed
}
