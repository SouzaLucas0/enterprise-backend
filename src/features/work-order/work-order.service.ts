import {
	ForbiddenException,
	forwardRef,
	Inject,
	Injectable,
	InternalServerErrorException,
	Logger,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CustomerService } from '../customer/customer.service'
import { CreateWorkOrderDto } from './dto/create-work-order.dto'
import { UpdateWorkOrderDto } from './dto/update-work-order.dto'
import { WorkOrder } from './entities/work-order.entity'
import { UpdateConfigDto } from 'src/core/config/dto/update-config.dto'
import { AllConfigService } from 'src/core/config/all-config.service'
import { TaskWorkOrderService } from 'src/jobs/work-order/work-order-task.service'
import { WorkOrderSituationService } from './work-order-situation.service'
import { MessagesService } from '../messages/messages.service'

@Injectable()
export class WorkOrderService {
	private readonly logger = new Logger(WorkOrderService.name)
	private readonly workOrderConfigId = 6
	private readonly jobKey = 'work-order'
	private readonly jobTitle = 'Ordem de Serviço'

	constructor(
		@InjectRepository(WorkOrder)
		private readonly workOrderRepository: Repository<WorkOrder>,
		@Inject(forwardRef(() => TaskWorkOrderService))
		private readonly taskWorkOrderService: TaskWorkOrderService,
		private readonly customerService: CustomerService,
		private readonly allConfigService: AllConfigService,
		private readonly messagesService: MessagesService,
	) {}

	async createWorkOrder(createWorkOrderDto: CreateWorkOrderDto) {
		if (!createWorkOrderDto) {
			this.logger.error('Dados da ordem de serviço não enviados')
			return false
		}

		const customer = await this.customerService.findOneCustomer(createWorkOrderDto.customerId)

		if (!customer) {
			this.logger.error(`Cliente ID: ${createWorkOrderDto.customerId} não encontrado`)
			return false
		}

		if (!customer.active) {
			this.logger.warn(`Ciente ${customer.name} inativo`)
			throw new ForbiddenException(`Ciente ${customer.name} inativo`)
		}

		const workOrder = this.workOrderRepository.create({
			id: createWorkOrderDto.id,
			situation: createWorkOrderDto.situation,
			date: createWorkOrderDto.date,
			prisma: createWorkOrderDto.prisma,
			brand: createWorkOrderDto.brand,
			model: createWorkOrderDto.model,
			vehiclePlate: createWorkOrderDto.vehiclePlate,
			km: createWorkOrderDto.km,
			defect: createWorkOrderDto.defect,
			belongings: createWorkOrderDto.belongings,
			forecast: createWorkOrderDto.forecast,
			mechanic: createWorkOrderDto.mechanic,
			active: createWorkOrderDto.active,
			customer,
		})

		const created = await this.workOrderRepository.save(workOrder)

		return created
	}

	async findAllWorkOrders() {
		const workOrders = await this.workOrderRepository.find({ relations: ['customer'] })
		return workOrders.filter((workOrder) => workOrder.customer.active || workOrder.active)
	}

	async findOneWorkOrder(id: string) {
		const workOrder = await this.workOrderRepository.findOne({
			where: { id: id },
			relations: ['customer'],
		})

		if (!workOrder) {
			return false
		}

		return workOrder
	}

	async updateWorkOrder(id: string, updateWorkOrderDto: UpdateWorkOrderDto) {
		const workOrder = await this.findOneWorkOrder(id)

		if (!workOrder) {
			return false
		}

		workOrder.situation = updateWorkOrderDto.situation ?? workOrder.situation
		workOrder.date = updateWorkOrderDto.date ?? workOrder.date
		workOrder.prisma = updateWorkOrderDto.prisma ?? workOrder.prisma
		workOrder.brand = updateWorkOrderDto.brand ?? workOrder.brand
		workOrder.model = updateWorkOrderDto.model ?? workOrder.model
		workOrder.vehiclePlate = updateWorkOrderDto.vehiclePlate ?? workOrder.vehiclePlate
		workOrder.km = updateWorkOrderDto.km ?? workOrder.km
		workOrder.defect = updateWorkOrderDto.defect ?? workOrder.defect
		workOrder.belongings = updateWorkOrderDto.belongings ?? workOrder.belongings
		workOrder.forecast = updateWorkOrderDto.forecast ?? workOrder.forecast
		workOrder.mechanic = updateWorkOrderDto.mechanic ?? workOrder.mechanic
		workOrder.active = updateWorkOrderDto.active ?? workOrder.active
		workOrder.lastSituationSent = updateWorkOrderDto.lastSituationSent ?? workOrder.lastSituationSent
		if (updateWorkOrderDto.customerId) {
			const customer = await this.customerService.findOneCustomer(updateWorkOrderDto.customerId)
			if (!customer) {
				this.logger.error(`Cliente ID: ${updateWorkOrderDto.customerId} não encontrado`)
				return false
			}
			workOrder.customer = customer
		}

		const updated = await this.workOrderRepository.save(workOrder)

		return updated
	}

	async removeWorkOrder(id: string) {
		const workOrder = await this.findOneWorkOrder(id)

		if (!workOrder) {
			return { success: false, message: `Ordem de serviço ID: ${id} não encontrada` }
		}

		await this.workOrderRepository.remove(workOrder)

		return { success: true, message: `Ordem de serviço ID: ${id} removida` }
	}

	async updateConfig(updateConfigDto: UpdateConfigDto) {
		try {
			const updated = await this.allConfigService.updateConfig(this.workOrderConfigId, updateConfigDto)

			if (updateConfigDto.runTime || updateConfigDto.runAuto) {
				this.taskWorkOrderService.updateSettings(updated.runTime, updated.runAuto)
			}

			return updated
		} catch (err) {
			throw new InternalServerErrorException(`${err}`)
		}
	}

	async findAllConfigs() {
		const workOrderConfig = await this.allConfigService.findOne(this.workOrderConfigId)
		return workOrderConfig
	}

	async findWelcomeMessage() {
		const message = await this.messagesService.findOne(999)
		return message
	}
}
