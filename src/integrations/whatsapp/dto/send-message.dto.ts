import { ApiProperty } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class SendMessageDto {
	@ApiProperty({ example: 'conta01' })
	@IsString()
	clientId: string

	@ApiProperty({ example: '5569984191509' })
	@IsString()
	number: string

	@ApiProperty({ example: 'Olá, isso é um teste!' })
	@IsString()
	message: string
}

export class SendMessageResponseDto {
	@ApiProperty({ example: 'Mensagem enviada com sucesso!' })
	@IsOptional()
	@IsString()
	success?: string

	@ApiProperty({ example: 'Erro ao enviar mensagem.' })
	@IsOptional()
	@IsString()
	error?: string
}
