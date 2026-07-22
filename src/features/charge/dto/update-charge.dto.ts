import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateChargeDto } from './create-charge.dto';
import { IsBoolean, IsDate, IsOptional } from 'class-validator';

export class UpdateChargeDto extends PartialType(CreateChargeDto) {
    @ApiProperty( { example: true } )
    @IsBoolean()
    @IsOptional()
    active?: boolean

    @ApiProperty( { example: '2024-12-31' } )
    @IsOptional()
    @IsDate()
    lastSentDate?: Date
}
