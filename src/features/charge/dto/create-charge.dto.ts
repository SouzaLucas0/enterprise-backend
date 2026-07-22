import { ApiProperty } from '@nestjs/swagger'
import { IsDate, IsIn, IsNumber, IsOptional, IsString } from 'class-validator'

export class CreateChargeDto {
	@ApiProperty({ example: `0001/01` })
	@IsString()
	id: string

	@ApiProperty({ example: `1900-01-01` })
	@IsString()
	expiration: string

	@ApiProperty({ example: `1900-01-01` })
	@IsDate()
	paymentDate: Date | null

	@ApiProperty({ example: 150.75 })
	@IsNumber()
	value: number

	@ApiProperty({ example: 9.99, default: 0.0 })
	@IsNumber()
	interest: number

	@ApiProperty({ example: 9.99, default: 0.0 })
	@IsNumber()
	fine: number

	@ApiProperty({ example: 'S', enum: ['S', 'D', 'M'] })
	@IsIn(['S', 'D', 'M'])
	interestType: InterestType

	@ApiProperty({ example: 1 })
	@IsNumber()
	installment: number

	@ApiProperty({ example: 3 })
	@IsNumber()
	qtdInstallments: number

	@ApiProperty({ example: 'boleto' })
	@IsString()
	type: string

	@ApiProperty({ example: 2 })
	@IsNumber()
	@IsOptional()
	qtdSents?: number

	@ApiProperty({ example: 'EcoCentauro' })
	@IsString()
	company: string

	@ApiProperty({ example: 'primeira regra' })
	@IsString()
	lastRoleId?: string

	@ApiProperty({ example: '00001' })
	@IsString()
	customerId: string

	@ApiProperty({ example: 1 })
	@IsNumber()
	@IsOptional()
	lastChargeRoleId?: number | null
}

export enum InterestType {
	SIMPLE = 'S',
	DAILY = 'D',
	MONTHLY = 'M',
}
