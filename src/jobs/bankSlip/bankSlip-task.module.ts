import { forwardRef, Module } from '@nestjs/common'
import { AppMetaModule } from '../../core/app-meta/app-meta.module'
import { CustomerModule } from '../../features/customer/customer.module'
import { LogsModule } from '../../features/logs/logs.module'
import { MessagesModule } from '../../features/messages/messages.module'
import { ParamsModule } from '../../features/params/params.module'
import { PdfModule } from '../../features/pdf/pdf.module'
import { FirebirdModule } from '../../integrations/firebird/firebird.module'
import { NotificationsModule } from '../../integrations/notifications/notifications.module'
import { WhatsappModule } from '../../integrations/whatsapp/whatsapp.module'
import { TaskBankSlipService } from './bankSlip-task.service'

@Module({
	imports: [
		FirebirdModule,
		WhatsappModule,
		MessagesModule,
		CustomerModule,
		forwardRef(() => PdfModule),
		ParamsModule,
		LogsModule,
		NotificationsModule,
		AppMetaModule,
	],
	providers: [TaskBankSlipService],
	exports: [TaskBankSlipService],
})
export class TaskBankSlipModule {}
