import { forwardRef, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AllConfigModule } from '../../core/config/all-config.module'
import { TaskSaleModule } from '../../jobs/sale/sale-task.module'
import { CustomerModule } from '../customer/customer.module'
import { MessageVariablesModule } from '../message-variables/message-variables.module'
import { MessagesModule } from '../messages/messages.module'
import { Sale } from './entities/sale.entity'
import { SaleController } from './sale.controller'
import { SaleService } from './sale.service'

@Module({
	imports: [
		TypeOrmModule.forFeature([Sale]),
		CustomerModule,
		AllConfigModule,
		MessagesModule,
		forwardRef(() => TaskSaleModule),
		MessageVariablesModule,
	],
	controllers: [SaleController],
	providers: [SaleService],
	exports: [SaleService],
})
export class SaleModule {}
