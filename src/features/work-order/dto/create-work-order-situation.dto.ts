import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator'
import { Message } from '../../../features/messages/entities/message.entity'

export class CreateWorkOrderSituationDto {
	@ApiProperty({ example: 1 })
	@IsOptional()
	@IsInt()
	id: number

	@ApiProperty({ example: 'Em execução' })
	@IsString()
	description: string

	@ApiProperty({ example: true })
	@IsBoolean()
	active: boolean

	@ApiProperty({ example: 'Olá, {{nomeCliente}}, seu veículo iniciou o serviço.' })
	@IsOptional()
	@IsString()
	message?: Message
}


