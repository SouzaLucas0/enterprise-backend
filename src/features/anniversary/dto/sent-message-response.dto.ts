import { AnniversarySent } from '../entities/anniversary-sent.entity'

export class SentMessageResponseDto {
	readonly id: number
	readonly isntance: string
	readonly sentDate: Date
	readonly message: string
	readonly customer: {
		id: string
		active: boolean
		name: string
		contact: string
		bithdaySentDate: Date | null
		bithday: Date | null
	}

	constructor(anniversarySent: AnniversarySent) {
		this.id = anniversarySent.id
		this.isntance = anniversarySent.isntance
		this.sentDate = anniversarySent.sentDate
		this.message = anniversarySent.message
		this.customer = {
			id: anniversarySent.customer.id,
			active: anniversarySent.customer.active,
			name: anniversarySent.customer.name,
			contact: anniversarySent.customer.contact,
			bithdaySentDate: anniversarySent.customer.bithdaySentDate,
			bithday: anniversarySent.customer.bithday,
		}
	}
}
