import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator'

export class CreatePdfDto {
	@ApiProperty({ example: `0000001` })
	@IsString()
	id: string

	@ApiProperty({ example: `0000001` })
	@IsString()
	@IsOptional()
	ourNumber?: string | null

	@ApiProperty({ example: `0000001` })
	@IsString()
	@IsOptional()
	nfeNumber?: string | null

	@ApiProperty({ example: true })
	@IsBoolean()
	@IsOptional()
	sentBankSlip?: boolean

	@ApiProperty({ example: true })
	@IsBoolean()
	@IsOptional()
	sentNfe?: boolean

	@ApiProperty({ example: true })
	@IsBoolean()
	@IsOptional()
	active?: boolean

	@ApiProperty({ example: `0000001` })
	@IsString()
	customerId: string
}
