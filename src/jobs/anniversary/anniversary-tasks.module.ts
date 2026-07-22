import { forwardRef, Module } from '@nestjs/common'
import { AppMetaModule } from '../../core/app-meta/app-meta.module'
import { AnniversaryModule } from '../../features/anniversary/anniversary.module'
import { CustomerModule } from '../../features/customer/customer.module'
import { LogsModule } from '../../features/logs/logs.module'
import { MessagesModule } from '../../features/messages/messages.module'
import { FirebirdModule } from '../../integrations/firebird/firebird.module'
import { NotificationsModule } from '../../integrations/notifications/notifications.module'
import { WhatsappModule } from '../../integrations/whatsapp/whatsapp.module'
import { TasksAnniversaryService } from './anniversary-tasks.service'

@Module({
	imports: [
		FirebirdModule,
		forwardRef(() => AnniversaryModule),
		WhatsappModule,
		MessagesModule,
		CustomerModule,
		LogsModule,
		NotificationsModule,
		AppMetaModule,
	],
	providers: [TasksAnniversaryService],
	exports: [TasksAnniversaryService],
})
export class TasksAnniversaryModule {}
