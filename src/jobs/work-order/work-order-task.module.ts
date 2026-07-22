import { forwardRef, Module } from '@nestjs/common'
import { WorkOrderModule } from 'src/features/work-order/work-order.module'
import { AppMetaModule } from '../../core/app-meta/app-meta.module'
import { CustomerModule } from '../../features/customer/customer.module'
import { LogsModule } from '../../features/logs/logs.module'
import { MessagesModule } from '../../features/messages/messages.module'
import { FirebirdModule } from '../../integrations/firebird/firebird.module'
import { NotificationsModule } from '../../integrations/notifications/notifications.module'
import { WhatsappModule } from '../../integrations/whatsapp/whatsapp.module'
import { TaskWorkOrderService } from './work-order-task.service'

@Module({
	imports: [FirebirdModule, WhatsappModule, MessagesModule, CustomerModule, forwardRef(() => WorkOrderModule), LogsModule, NotificationsModule, AppMetaModule],
	providers: [TaskWorkOrderService],
	exports: [TaskWorkOrderService],
})
export class TaskWorkOrderModule {}
