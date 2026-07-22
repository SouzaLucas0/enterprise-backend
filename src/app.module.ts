import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AllConfigModule } from './core/config/all-config.module'
import { DatabaseModule } from './core/database/database.module'
import { SeedModule } from './core/seeds/seed.module'
import { AnniversaryModule } from './features/anniversary/anniversary.module'
import { ChargeModule } from './features/charge/charge.module'
import { CustomerModule } from './features/customer/customer.module'
import { LogsModule } from './features/logs/logs.module'
import { MessageVariablesModule } from './features/message-variables/message-variables.module'
import { MessagesModule } from './features/messages/messages.module'
import { ParamsModule } from './features/params/params.module'
import { PdfModule } from './features/pdf/pdf.module'
import { SaleModule } from './features/sale/sale.module'
import { WorkOrderModule } from './features/work-order/work-order.module'
import { FirebirdModule } from './integrations/firebird/firebird.module'
import { NotificationsModule } from './integrations/notifications/notifications.module'
import { WhatsappModule } from './integrations/whatsapp/whatsapp.module'
import { TasksAnniversaryModule } from './jobs/anniversary/anniversary-tasks.module'
import { TaskBankSlipModule } from './jobs/bankSlip/bankSlip-task.module'
import { ChargeTaskModule } from './jobs/charge/charge-task.module'
import { TaskNfeModule } from './jobs/nfe/nfe-task.module'
import { MessageListenerModule } from './workers/message-listener/message-listener.module'

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		DatabaseModule,
		SeedModule,
		ScheduleModule.forRoot(),
		FirebirdModule,
		TasksAnniversaryModule,
		AnniversaryModule,
		WhatsappModule,
		MessagesModule,
		ChargeModule,
		AllConfigModule,
		CustomerModule,
		ParamsModule,
		ChargeTaskModule,
		PdfModule,
		TaskNfeModule,
		TaskBankSlipModule,
		SaleModule,
		MessageVariablesModule,
		LogsModule,
		NotificationsModule,
		MessageListenerModule,
		WorkOrderModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
