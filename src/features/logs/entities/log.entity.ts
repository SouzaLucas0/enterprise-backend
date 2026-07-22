import { Customer } from '../../customer/entities/customer.entity'
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm'

@Entity()
export class Log {
	@PrimaryGeneratedColumn()
	id: number

	@ManyToOne(() => Customer)
	@JoinColumn({ name: 'fk_customer' })
	customer: Customer

	@Column()
	whatsappNumber: string

	@Column()
	module: string

	@Column()
	obs: string

	@CreateDateColumn()
	createdAt: Date

	@UpdateDateColumn()
	updatedAt: Date
}
