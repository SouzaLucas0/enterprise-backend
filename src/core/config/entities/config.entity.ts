import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity()
export class AllConfig {
	@PrimaryGeneratedColumn()
	id: number

	@Column()
	runAuto: boolean

	@Column({ type: 'time' })
	runTime: string

	@Column({ type: 'time' })
	runFirebird: string

	@Column({ default: null })
	runInstance: string

	@CreateDateColumn()
	createdAt: Date

	@UpdateDateColumn()
	updatedAt: Date
}
