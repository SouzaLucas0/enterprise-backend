import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean, IsDate, IsNumber, IsOptional, IsString } from 'class-validator'

export class CreateSaleDto {
	@ApiProperty({ example: '000011' })
	@IsString()
	id: string

	@ApiProperty({ example: 'EcoCentauro' })
	@IsString()
	companyName: string

	@ApiProperty({ example: 1 })
	@IsNumber()
	companyID: number

	@ApiProperty({ example: 'Marcelo' })
	@IsString()
	seller: string

	@ApiProperty({ example: 'A vista' })
	@IsString()
	paymentMethod: string

	@ApiProperty({ example: 2 })
	@IsNumber()
	installments: number

	@ApiProperty({ example: 20.0 })
	@IsNumber()
	grossValue: number

	@ApiProperty({ example: 20.0 })
	@IsNumber()
	netValue: number

	@ApiProperty({ example: 9.99 })
	@IsNumber()
	discount: number

	@ApiProperty({ example: 2.0 })
	@IsNumber()
	discountPercent: number

	@ApiProperty({ example: '2025-01-01' })
	@IsDate()
	date: Date

	@ApiProperty({ example: '09:00' })
	@IsString()
	hour: Date

	@ApiProperty({ example: 'O Mesmo' })
	@IsOptional()
	@IsString()
	transportName?: string

	@ApiProperty({ example: 'ABC-1234' })
	@IsOptional()
	@IsString()
	transportPlate?: string

	@ApiProperty({ example: 'Emitente' })
	@IsOptional()
	@IsString()
	freightType?: string

	@ApiProperty({ example: 9.99 })
	@IsOptional()
	@IsNumber()
	freightValue?: number

	@ApiProperty({ example: 2 })
	@IsOptional()
	@IsNumber()
	packageQuantity?: number

	@ApiProperty({ example: 9.99 })
	@IsOptional()
	@IsNumber()
	grossWeight?: number

	@ApiProperty({ example: 9.99 })
	@IsOptional()
	@IsNumber()
	netWeight?: number

	@ApiProperty({ example: 9.99 })
	@IsOptional()
	@IsNumber()
	expenses?: number

	@ApiProperty({ example: 9.99 })
	@IsOptional()
	@IsNumber()
	warranty?: number

	@ApiProperty({ example: 9.99 })
	@IsOptional()
	@IsNumber()
	entryValue?: number

	@ApiProperty({ example: 'obs...' })
	@IsOptional()
	@IsString()
	observation?: string

	@ApiProperty({ example: true })
	@IsOptional()
	@IsBoolean()
	active?: boolean

	@ApiProperty({ example: true })
	@IsOptional()
	@IsBoolean()
	sentSale?: boolean

	@ApiProperty({ example: '000001' })
	@IsString()
	customerId: string
}
