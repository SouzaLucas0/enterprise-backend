import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateWhatsappInstanceDto {
	@ApiProperty({ example: 'minhaConta' })
	@IsString()
	clientId: string

	@ApiProperty({ example: 'abc123xyz' })
	@IsString()
	@IsOptional()
	token?: string

	@ApiProperty({ example: 'connected' })
	@IsString()
	@IsOptional()
	status?: string

	@ApiProperty({ example: 'minhaConta' })
	@IsString()
	@IsOptional()
	name?: string
}
