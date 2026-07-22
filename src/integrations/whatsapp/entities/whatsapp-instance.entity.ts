import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm'

@Entity('whatsapp_instances')
export class WhatsappInstance {
	@PrimaryColumn()
	clientId: string

	@Column()
	token: string

	@Column({ default: 'disconnected' })
	status: string

	@Column({ nullable: true })
	name: string

	@Column({ nullable: true })
	profileName: string

	@Column({ nullable: true })
	profilePicUrl: string

	@Column({ nullable: true })
	owner: string

	@Column({ default: true })
	isActive: boolean

	@CreateDateColumn()
	createdAt: Date

	@UpdateDateColumn()
	updatedAt: Date
}