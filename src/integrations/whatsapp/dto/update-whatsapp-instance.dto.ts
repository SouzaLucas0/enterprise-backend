import { PartialType } from '@nestjs/swagger'
import { CreateWhatsappInstanceDto } from './create-whatsapp-instance.dto'

export class UpdateWhatsappInstanceDto extends PartialType(CreateWhatsappInstanceDto) {
    
}