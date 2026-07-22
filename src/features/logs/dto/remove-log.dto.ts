import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class RemoveLogDto {
    @ApiProperty({ example: 'charge' })
    @IsNotEmpty()
    @IsString()
    module: string
}
