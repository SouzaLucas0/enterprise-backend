import { Message } from '../../messages/entities/message.entity'
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity()
export class ChargeRole {
	@PrimaryGeneratedColumn()
	id: number

	@Column()
	description: string

	@Column()
	qtdDaysLate: number
	
	@Column()
	sendBol: boolean
	
    @Column()
    active: boolean
	
    @Column()
    autoSend: boolean
	
    @CreateDateColumn()
    createdAt: Date
	
    @UpdateDateColumn()
    updatedAt: Date

	@ManyToOne(() => Message)
	@JoinColumn({ name: 'fk_message' })
	message: Message
}
