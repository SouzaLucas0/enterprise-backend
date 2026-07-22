import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import { CreateWorkOrderDto } from './dto/create-work-order.dto'
import { UpdateWorkOrderDto } from './dto/update-work-order.dto'
import { WorkOrderService } from './work-order.service'
import { UpdateConfigDto } from 'src/core/config/dto/update-config.dto'
import { MessageVariablesService } from '../message-variables/message-variables.service'

@Controller('work-order')
export class WorkOrderController {
	private readonly messageVariablesID = 'workOrder'

	constructor(
		private readonly workOrderService: WorkOrderService,
		private readonly messageVariablesService: MessageVariablesService,
	) {}

	@Get('messageVariables')
	async findAllMessageVariables() {
		return await this.messageVariablesService.findByFunction(this.messageVariablesID)
	}

	@Patch('config')
	async createConfig(@Body() updateConfigDto: UpdateConfigDto) {
		return await this.workOrderService.updateConfig(updateConfigDto)
	}

	@Get('config')
	async findAllConfig() {
		return await this.workOrderService.findAllConfigs()
	}

	@Post()
	async create(@Body() createWorkOrderDto: CreateWorkOrderDto) {
		return await this.workOrderService.createWorkOrder(createWorkOrderDto)
	}

	@Get()
	async findAll() {
		return await this.workOrderService.findAllWorkOrders()
	}

	@Get(':id')
	async findOne(@Param('id') id: string) {
		return await this.workOrderService.findOneWorkOrder(id)
	}

	@Patch(':id')
	async update(@Param('id') id: string, @Body() updateWorkOrderDto: UpdateWorkOrderDto) {
		return await this.workOrderService.updateWorkOrder(id, updateWorkOrderDto)
	}

	@Delete(':id')
	async remove(@Param('id') id: string) {
		return await this.workOrderService.removeWorkOrder(id)
	}
}
