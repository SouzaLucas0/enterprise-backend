import { forwardRef, Logger, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppMetaModule } from '../../core/app-meta/app-meta.module'
import { AllConfigModule } from '../../core/config/all-config.module'
import { NotificationsModule } from '../../integrations/notifications/notifications.module'
import { WhatsappModule } from '../../integrations/whatsapp/whatsapp.module'
import { TasksAnniversaryModule } from '../../jobs/anniversary/anniversary-tasks.module'
import { CustomerModule } from '../customer/customer.module'
import { LogsModule } from '../logs/logs.module'
import { MessageVariablesModule } from '../message-variables/message-variables.module'
import { AnniversaryController } from './anniversary.controller'
import { AnniversaryService } from './anniversary.service'
import { AnniversarySent } from './entities/anniversary-sent.entity'
import { MessagesModule } from '../messages/messages.module'

@Module({
	imports: [
		TypeOrmModule.forFeature([AnniversarySent]),
		forwardRef(() => TasksAnniversaryModule),
		WhatsappModule,
		AllConfigModule,
		CustomerModule,
		MessageVariablesModule,
		LogsModule,
		AppMetaModule,
		NotificationsModule,
		MessagesModule,
	],
	controllers: [AnniversaryController],
	providers: [AnniversaryService, Logger],
	exports: [AnniversaryService],
})
export class AnniversaryModule {}
