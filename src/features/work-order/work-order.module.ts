import { forwardRef, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AllConfigModule } from 'src/core/config/all-config.module'
import { TaskWorkOrderModule } from 'src/jobs/work-order/work-order-task.module'
import { CustomerModule } from '../customer/customer.module'
import { MessagesModule } from '../messages/messages.module'
import { WorkOrderSituation } from './entities/work-order-situation.entity'
import { WorkOrder } from './entities/work-order.entity'
import { WorkOrderSituationController } from './work-order-situation.controller'
import { WorkOrderSituationService } from './work-order-situation.service'
import { WorkOrderController } from './work-order.controller'
import { WorkOrderService } from './work-order.service'
import { MessageVariablesModule } from '../message-variables/message-variables.module'

@Module({
	imports: [
		TypeOrmModule.forFeature([WorkOrder, WorkOrderSituation]),
		forwardRef(() => TaskWorkOrderModule),
		CustomerModule,
		MessagesModule,
		AllConfigModule,
		MessageVariablesModule
	],
	controllers: [WorkOrderController, WorkOrderSituationController],
	providers: [WorkOrderService, WorkOrderSituationService],
	exports: [WorkOrderService, WorkOrderSituationService],
})
export class WorkOrderModule {}
