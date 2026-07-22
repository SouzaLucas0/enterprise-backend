import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import { CreateWorkOrderSituationMessageDto } from './dto/create-work-order-situation-message.dto'
import { CreateWorkOrderSituationDto } from './dto/create-work-order-situation.dto'
import { UpdateWorkOrderSituationMessageDto } from './dto/update-work-order-situation-message.dto'
import { UpdateWorkOrderSituationDto } from './dto/update-work-order-situation.dto'
import { WorkOrderSituationService } from './work-order-situation.service'
import { UpdateConfigDto } from 'src/core/config/dto/update-config.dto'

@Controller('work-order-situations')
export class WorkOrderSituationController {
	constructor(private readonly workOrderSituationService: WorkOrderSituationService) {}

	@Post()
	async create(@Body() dto: CreateWorkOrderSituationDto) {
		return await this.workOrderSituationService.create(dto)
	}

	@Get()
	async findAll() {
		return await this.workOrderSituationService.findAll()
	}

	@Get(':id')
	async findOne(@Param('id') id: string) {
		return await this.workOrderSituationService.findOne(Number(id))
	}

	@Patch(':id')
	async update(@Param('id') id: string, @Body() dto: UpdateWorkOrderSituationDto) {
		return await this.workOrderSituationService.update(Number(id), dto)
	}

	@Post('message')
	async createMessage(@Body() dto: CreateWorkOrderSituationMessageDto) {
		return await this.workOrderSituationService.createMessage(dto)
	}

	@Patch('message/:id')
	async updateMessage(@Param('id') id: string, @Body() dto: UpdateWorkOrderSituationMessageDto) {
		return await this.workOrderSituationService.updateMessage(Number(id), dto)
	}

	@Delete(':id')
	async remove(@Param('id') id: string) {
		return await this.workOrderSituationService.remove(Number(id))
	}

	@Post('getSituations')
	async getSituations() {
		return await this.workOrderSituationService.getSituations()
	}
}
