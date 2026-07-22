import { forwardRef, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppMetaModule } from '../../core/app-meta/app-meta.module'
import { AllConfigModule } from '../../core/config/all-config.module'
import { NotificationsModule } from '../../integrations/notifications/notifications.module'
import { WhatsappModule } from '../../integrations/whatsapp/whatsapp.module'
import { ChargeTaskModule } from '../../jobs/charge/charge-task.module'
import { CustomerModule } from '../customer/customer.module'
import { LogsModule } from '../logs/logs.module'
import { MessageVariablesModule } from '../message-variables/message-variables.module'
import { MessagesModule } from '../messages/messages.module'
import { ChargeController } from './charge.controller'
import { ChargeService } from './charge.service'
import { Charge } from './entities/charge.entity'
import { ChargeRole } from './entities/chargeRole.entity'

@Module({
	imports: [
		TypeOrmModule.forFeature([Charge, ChargeRole]),
		CustomerModule,
		AllConfigModule,
		MessagesModule,
		WhatsappModule,
		forwardRef(() => ChargeTaskModule),
		MessageVariablesModule,
		LogsModule,
		AppMetaModule,
		NotificationsModule
	],
	controllers: [ChargeController],
	providers: [ChargeService],
	exports: [ChargeService],
})
export class ChargeModule {}
