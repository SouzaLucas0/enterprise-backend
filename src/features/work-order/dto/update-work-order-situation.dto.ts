import { PartialType } from '@nestjs/swagger'
import { CreateWorkOrderSituationDto } from './create-work-order-situation.dto'

export class UpdateWorkOrderSituationDto extends PartialType(CreateWorkOrderSituationDto) {}
