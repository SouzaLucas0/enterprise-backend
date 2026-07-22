import { ApiProperty, PartialType } from '@nestjs/swagger'
import { IsBoolean, IsDate, IsOptional } from 'class-validator'
import { CreateCustomerDto } from './create-customer.dto'
import { Transform } from 'class-transformer'

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
	@ApiProperty({ example: true })
	@IsBoolean()
	@IsOptional()
	active?: boolean

	@ApiProperty({ example: '1990-01-01' })
	@IsOptional()
	@Transform(({ value }) => {
		if (value === null) return null
		if (value) return new Date(value)
		return undefined
	})
	bithdaySentDate?: Date | null

	@ApiProperty({ example: true })
	@IsBoolean()
	@IsOptional()
	sendBithday?: boolean

	@ApiProperty({ example: true })
	@IsBoolean()
	@IsOptional()
	sendCharge?: boolean

	@ApiProperty({ example: true })
	@IsBoolean()
	@IsOptional()
	sendBankSlip?: boolean

	@ApiProperty({ example: true })
	@IsBoolean()
	@IsOptional()
	sendNfe?: boolean

	@ApiProperty({ example: true })
	@IsBoolean()
	@IsOptional()
	sendSale?: boolean

	@ApiProperty({ example: true })
	@IsBoolean()
	@IsOptional()
	sendOS?: boolean
}
