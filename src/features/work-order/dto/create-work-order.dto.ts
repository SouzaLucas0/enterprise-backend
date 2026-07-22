import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean, IsDate, IsNumber, IsOptional, IsString } from 'class-validator'

export class CreateWorkOrderDto {
	@ApiProperty({ example: '0001' })
	@IsString()
	id: string

	@ApiProperty({ example: 'Aberta' })
	@IsString()
	situation: string

	@ApiProperty({ example: '2026-04-05' })
	@IsDate()
	date: Date

	@ApiProperty({ example: 1234 })
	@IsNumber()
	prisma: number

	@ApiProperty({ example: '000001' })
	@IsString()
	customerId: string

	@ApiProperty({ example: 'Fiat' })
	@IsString()
	brand: string

	@ApiProperty({ example: 'Strada' })
	@IsString()
	model: string

	@ApiProperty({ example: 'ABC1D23' })
	@IsString()
	vehiclePlate: string

	@ApiProperty({ example: 120000 })
	@IsNumber()
	km: number

	@ApiProperty({ example: 'Barulho na suspensão dianteira' })
	@IsString()
	defect: string

	@ApiProperty({ example: 'Chave reserva, estepe e manual' })
	@IsString()
	belongings: string

	@ApiProperty({ example: '2026-04-10T00:00:00.000Z' })
	@IsDate()
	forecast: Date

	@ApiProperty({ example: 'João' })
	@IsString()
	mechanic: string

	@ApiProperty({ example: true })
	@IsBoolean()
	active: boolean

	@ApiProperty({ example: 'ABERTA' })
	@IsString()	
	@IsOptional()
	lastSituationSent?: string
}
