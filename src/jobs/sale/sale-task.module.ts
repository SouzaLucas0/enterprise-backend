import { forwardRef, Module } from '@nestjs/common'
import { AppMetaModule } from '../../core/app-meta/app-meta.module'
import { CustomerModule } from '../../features/customer/customer.module'
import { LogsModule } from '../../features/logs/logs.module'
import { MessagesModule } from '../../features/messages/messages.module'
import { SaleModule } from '../../features/sale/sale.module'
import { FirebirdModule } from '../../integrations/firebird/firebird.module'
import { NotificationsModule } from '../../integrations/notifications/notifications.module'
import { WhatsappModule } from '../../integrations/whatsapp/whatsapp.module'
import { TaskSaleService } from './sale-task.service'

@Module({
	imports: [FirebirdModule, WhatsappModule, MessagesModule, CustomerModule, forwardRef(() => SaleModule), LogsModule, NotificationsModule, AppMetaModule],
	providers: [TaskSaleService],
	exports: [TaskSaleService],
})
export class TaskSaleModule {}
