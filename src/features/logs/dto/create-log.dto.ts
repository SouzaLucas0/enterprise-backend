import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class CreateLogDto {
	@ApiProperty({ example: '000001' })
	@IsString()
	@IsNotEmpty()
	customerId: string

	@ApiProperty({ example: '6988888888' })
	@IsString()
	@IsNotEmpty()
	whatsappNumber: string

	@ApiProperty({ example: 'charge' })
	@IsString()
	@IsNotEmpty()
	module: string

	@ApiProperty({ example: 'O contato não tem WhatsApp, verifique o cadastro do cliente.' })
	@IsNotEmpty()
	@IsString()
	obs: string
}
