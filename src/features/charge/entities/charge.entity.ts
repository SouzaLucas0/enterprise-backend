import {
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	UpdateDateColumn
} from 'typeorm'
import { Customer } from '../../customer/entities/customer.entity'

export enum InterestType {
	SIMPLE = 'S',
	DAILY = 'D',
	MONTHLY = 'M',
}

@Entity()
export class Charge {
	@PrimaryColumn()
	id: string

	@Column({ type: 'date' })
	expiration: Date

	@Column({ type: 'decimal' })
	value: number

	@Column({ type: 'decimal', default: 0.0 })
	interest: number

	@Column({
		type: 'simple-enum',
		enum: InterestType,
		default: InterestType.SIMPLE,
	})
	interestType: InterestType

	@Column({ type: 'decimal', default: 0.0 })
	fine: number

	@Column()
	installment: number

	@Column()
	qtdInstallments: number

	@Column()
	type: string

	@Column()
	qtdSents: number

	@Column({ type: Date, nullable: true, default: null })
	lastSentDate: Date

	@Column({ type: Date, nullable: true, default: null })
	paymentDate: Date | null

	@Column({ default: true })
	active: boolean

	@CreateDateColumn()
	createdAt: Date

	@UpdateDateColumn()
	updatedAt: Date

	@Column({ default: '' })
	company: string

	@Column({ type: 'int', default: null, nullable: true })
	lastChargeRoleId?: number | null

	@ManyToOne(() => Customer)
	@JoinColumn({ name: 'fk_customer' })
	customer: Customer
}
