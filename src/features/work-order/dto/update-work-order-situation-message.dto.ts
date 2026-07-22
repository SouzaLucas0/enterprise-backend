import { ApiProperty, PartialType } from '@nestjs/swagger'
import { CreateWorkOrderSituationMessageDto } from './create-work-order-situation-message.dto'
import { IsBoolean, IsOptional } from 'class-validator'

export class UpdateWorkOrderSituationMessageDto extends PartialType(CreateWorkOrderSituationMessageDto) {
    @ApiProperty({ example: true })
    @IsBoolean()
    @IsOptional()
    active?: boolean
}
