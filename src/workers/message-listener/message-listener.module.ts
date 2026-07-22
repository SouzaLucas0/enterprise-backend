import { Module } from '@nestjs/common'
import { CustomerModule } from '../../features/customer/customer.module'
import { LogsModule } from '../../features/logs/logs.module'
import { WhatsappModule } from '../../integrations/whatsapp/whatsapp.module'
import { MessageListenerService } from './message-listener.service'

@Module({
	imports: [WhatsappModule, CustomerModule, LogsModule],
	providers: [MessageListenerService],
	exports: [MessageListenerService],
})
export class MessageListenerModule {}
