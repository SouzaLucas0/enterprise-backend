import { forwardRef, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AllConfigModule } from '../../core/config/all-config.module'
import { TaskBankSlipModule } from '../../jobs/bankSlip/bankSlip-task.module'
import { TaskNfeModule } from '../../jobs/nfe/nfe-task.module'
import { CustomerModule } from '../customer/customer.module'
import { MessageVariablesModule } from '../message-variables/message-variables.module'
import { MessagesModule } from '../messages/messages.module'
import { Pdf } from './entities/pdf.entity'
import { PdfController } from './pdf.controller'
import { PdfService } from './pdf.service'

@Module({
	imports: [
		TypeOrmModule.forFeature([Pdf]),
		AllConfigModule,
		CustomerModule,
		forwardRef(() => TaskBankSlipModule),
		forwardRef(() => TaskNfeModule),
		MessagesModule,
		MessageVariablesModule,
	],
	controllers: [PdfController],
	providers: [PdfService],
	exports: [PdfService],
})
export class PdfModule {}
