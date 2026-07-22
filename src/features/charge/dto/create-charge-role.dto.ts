import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean, IsNumber, IsString } from 'class-validator'

export class CreateChargeRoleDto {
	@ApiProperty({ example: 'Primeiro contato' })
	@IsString()
	description: string

	@ApiProperty({ example: 10 })
	@IsNumber()
	qtdDaysLate: number

	
	@ApiProperty({ example: true })
	@IsBoolean()
	sendBol: boolean
	
	@ApiProperty({ example: true })
	@IsBoolean()
	active: boolean
	
	@ApiProperty({ example: false })
	@IsBoolean()
	autoSend: boolean

	@ApiProperty({ example: 'Envio de notificação ao cliente' })
	@IsString()
	message: string
}
