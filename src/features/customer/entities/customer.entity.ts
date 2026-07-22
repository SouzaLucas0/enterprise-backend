import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity()
export class Customer {
	@PrimaryColumn()
	id: string

	@Column({ default: true })
	active: boolean

	@Column()
	name: string

	@Column()
	contact: string

	@Column({ default: null, type: 'date', nullable: true })
	bithday: Date | null

	@Column({ default: null, type: 'date', nullable: true })
	bithdaySentDate: Date | null

	@Column({ default: null, type: 'date' })
	lastPurchaseDate: Date

	@Column({ default: null })
	lastPurchaseValue: number

	@Column({ default: '' })
	company: string

	@Column({ default: true })
	sendBithday: boolean

	@Column({ default: true })
	sendCharge: boolean

	@Column({ default: true })
	sendBankSlip: boolean

	@Column({ default: true })
	sendNfe: boolean

	@Column({ default: true })
	sendSale: boolean

	@Column({ default: true })
	sendOS: boolean

	@Column({ default: false })
	firstMessageSent: boolean
}
