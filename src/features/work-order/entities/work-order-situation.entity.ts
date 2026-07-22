import { Message } from '../../../features/messages/entities/message.entity'
import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm'

@Entity()
export class WorkOrderSituation {
	@PrimaryColumn()
	id: number

	@Column()
	description: string

	@Column()
	active: boolean

	@OneToOne(() => Message, { cascade: true, nullable: true })
	@JoinColumn()
	message?: Message
}
