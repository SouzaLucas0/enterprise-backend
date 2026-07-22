import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm'
import { Customer } from '../../customer/entities/customer.entity'

@Entity()
export class WorkOrder {
	@PrimaryColumn()
	id: string

	@Column()
	situation: string

	@Column({ type: 'date' })
	date: Date

	@Column({ type: 'int' })
	prisma: number

	@ManyToOne(() => Customer)
	@JoinColumn({ name: 'fk_customer' })
	customer: Customer

	@Column()
	brand: string

	@Column()
	model: string

	@Column()
	vehiclePlate: string

	@Column({ type: 'int', nullable: true})
	km: number

	@Column({ type: 'text' })
	defect: string

	@Column({ type: 'text' })
	belongings: string

	@Column({ type: 'date' })
	forecast: Date

	@Column({ nullable: true })
	mechanic: string

    @Column({ default: true })
    active: boolean

	@Column({ default: null, nullable: true })
	lastSituationSent: string
}
