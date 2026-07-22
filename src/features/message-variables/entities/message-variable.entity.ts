import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
export class MessageVariable {
	@PrimaryGeneratedColumn()
	id: number

	@Column({ type: 'simple-array' })
	variables: string[]

	@Column()
	function: string
}
