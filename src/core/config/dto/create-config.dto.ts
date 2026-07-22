import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'

export class CreateConfigDto {
    @ApiProperty({ example: 1 })
    @IsNotEmpty()
    @IsNumber()
    id: number

	@ApiProperty({ example: true })
	@IsBoolean()
	@IsNotEmpty()
	runAuto: boolean

	@ApiProperty({ example: `09:00` })
	@IsString()
	@IsNotEmpty()
	runTime: string

	@ApiProperty({ example: `08:00` })
	@IsString()
	@IsNotEmpty()
	runFirebird: string

	@ApiProperty({ example: `Istancia-01` })
	@IsString()
	@IsOptional()
	runInstance: string
}
