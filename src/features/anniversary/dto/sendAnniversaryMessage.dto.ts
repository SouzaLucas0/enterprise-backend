import { ApiProperty } from '@nestjs/swagger'
import { IsNumber, IsNotEmpty, IsString } from 'class-validator'

export class SendAnniversaryMessageDto {
	@ApiProperty({ example: 'default' })
	@IsString()
	@IsNotEmpty()
	clientId: string

	@ApiProperty({ example: '00001' })
	@IsString()
	@IsNotEmpty()
	customerId: string

	@ApiProperty({
		example: '5569984191509',
	})
	@IsString()
	@IsNotEmpty()
	number: string

	@ApiProperty({
		example: 'Olá, isso é um teste!',
	})
	@IsString()
	@IsNotEmpty()
	message: string
}
