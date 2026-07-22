import { Customer } from '../../customer/entities/customer.entity'
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm'

@Entity()
export class Sale {
	@PrimaryColumn()
	id: string

	@Column()
	seller: string

	@Column()
	paymentMethod: string

	@Column()
	installments: number

	@Column({ type: 'decimal' })
	grossValue: number

	@Column({ type: 'decimal' })
	netValue: number

	@Column({ type: 'decimal' })
	discount: number

	@Column({ type: 'decimal' })
	discountPercent: number

	@Column({ type: 'date' })
	date: Date

	@Column({ type: 'time' })
	hour: Date

	@Column({ default: true })
	active: boolean

	@Column({ default: false })
	sentSale: boolean

	@Column()
	companyName: string

	@Column()
	companyID: number

	@Column({ default: null, nullable: true })
	transportName: string

	@Column({ default: null, nullable: true })
	transportPlate: string

	@Column({ default: null, nullable: true })
	freightType: string

	@Column({ type: 'decimal', default: null, nullable: true })
	freightValue: number

	@Column({ default: null, nullable: true })
	packageQuantity: number

	@Column({ default: null, nullable: true })
	grossWeight: number

	@Column({ default: null, nullable: true })
	netWeight: number

	@Column({ type: 'decimal', default: null, nullable: true })
	expenses: number

	@Column({ type: 'decimal', default: null, nullable: true })
	warranty: number

	@Column({ default: null, nullable: true })
	entryValue: number

	@Column({ type: 'text', default: null, nullable: true })
	observation: string | null

	@ManyToOne(() => Customer)
	@JoinColumn({ name: 'fk_customer' })
	customer: Customer
}
