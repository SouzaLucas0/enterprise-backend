import { BadGatewayException, forwardRef, Inject, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { TaskWorkOrderService } from 'src/jobs/work-order/work-order-task.service'
import { Repository } from 'typeorm'
import { MessagesService } from '../messages/messages.service'
import { CreateWorkOrderSituationMessageDto } from './dto/create-work-order-situation-message.dto'
import { CreateWorkOrderSituationDto } from './dto/create-work-order-situation.dto'
import { UpdateWorkOrderSituationMessageDto } from './dto/update-work-order-situation-message.dto'
import { UpdateWorkOrderSituationDto } from './dto/update-work-order-situation.dto'
import { WorkOrderSituation } from './entities/work-order-situation.entity'

@Injectable()
export class WorkOrderSituationService {
	private readonly logger = new Logger(WorkOrderSituationService.name)

	constructor(
		@InjectRepository(WorkOrderSituation)
		private readonly workOrderSituationRepository: Repository<WorkOrderSituation>,
		private readonly messageService: MessagesService,
		@Inject(forwardRef(() => TaskWorkOrderService))
		private readonly taskWorkOrderService: TaskWorkOrderService,
	) {}

	async create(createWorkOrderSituationDto: CreateWorkOrderSituationDto) {
		if (!createWorkOrderSituationDto) {
			this.logger.error('Dados não enviados para criação de situação de ordem de serviço')
			throw new BadGatewayException('Dados não enviados para criação de situação de ordem de serviço')
		}

		const situation = this.workOrderSituationRepository.create({
			id: createWorkOrderSituationDto.id,
			description: createWorkOrderSituationDto.description,
			active: createWorkOrderSituationDto.active,
		})

		return await this.workOrderSituationRepository.save(situation)
	}

	async createMessage(createWorkOrderSituationMessageDto: CreateWorkOrderSituationMessageDto) {
		if (!createWorkOrderSituationMessageDto) {
			this.logger.error('Dados não enviados para criação de mensagem de situação de ordem de serviço')
			throw new BadGatewayException('Dados não enviados para criação de mensagem de situação de ordem de serviço')
		}

		const situation = await this.workOrderSituationRepository.findOne({
			where: { id: createWorkOrderSituationMessageDto.situationId },
		})

		if (!situation) {
			this.logger.error(
				`Situação de ordem de serviço com ID ${createWorkOrderSituationMessageDto.situationId} não encontrada para associar mensagem`,
			)
			throw new BadGatewayException(
				`Situação de ordem de serviço com ID ${createWorkOrderSituationMessageDto.situationId} não encontrada para associar mensagem`,
			)
		}

		const message = await this.messageService.create({ message: createWorkOrderSituationMessageDto.message })

		if (!message) {
			this.logger.error('Falha ao criar mensagem para situação de ordem de serviço')
			throw new BadGatewayException('Falha ao criar mensagem para situação de ordem de serviço')
		}

		const updated = await this.update(situation.id, {
			message: message,
		})

		return updated
	}

	async findAll() {
		return await this.workOrderSituationRepository.find({ relations: ['message'] })
	}

	async findOne(id: number) {
		return await this.workOrderSituationRepository.findOne({ where: { id }, relations: ['message'] })
	}

	async update(id: number, updateWorkOrderSituationDto: UpdateWorkOrderSituationDto) {
		if (!updateWorkOrderSituationDto) {
			this.logger.error('Dados não enviados para atualização de situação de ordem de serviço')
			throw new BadGatewayException('Dados não enviados para atualização de situação de ordem de serviço')
		}

		if (!id) {
			this.logger.error('ID não enviado para atualização de situação de ordem de serviço')
			throw new BadGatewayException('ID não enviado para atualização de situação de ordem de serviço')
		}

		const situation = await this.findOne(id)

		if (!situation) {
			throw new BadGatewayException(`Situação de ordem de serviço com ID ${id} não encontrada para atualização`)
		}

		situation.active = updateWorkOrderSituationDto.active ?? situation.active
		situation.description = updateWorkOrderSituationDto.description ?? situation.description

		if (updateWorkOrderSituationDto.message) {
			situation.message = updateWorkOrderSituationDto.message
		}

		const updated = await this.workOrderSituationRepository.save(situation)

		return updated
	}

	async remove(id: number) {
		const situation = await this.findOne(id)

		if (!situation) {
			throw new BadGatewayException(`Situação de ordem de serviço com ID ${id} não encontrada para remoção`)
		}

		return await this.workOrderSituationRepository.remove(situation)
	}

	async updateMessage(id: number, updateWorkOrderSituationMessageDto: UpdateWorkOrderSituationMessageDto) {
		if (!id) {
			this.logger.error('ID não enviado para atualização de mensagem de situação de ordem de serviço')
			throw new BadGatewayException('ID não enviado para atualização de mensagem de situação de ordem de serviço')
		}

		if (!updateWorkOrderSituationMessageDto.message) {
			this.logger.error('Dados não enviados para atualização de mensagem de situação de ordem de serviço')
			throw new BadGatewayException(
				'Dados não enviados para atualização de mensagem de situação de ordem de serviço',
			)
		}

		const situation = await this.findOne(id)

		if (!situation) {
			this.logger.error(`Situação de ordem de serviço com ID ${id} não encontrada para atualização de mensagem`)
			throw new BadGatewayException(
				`Situação de ordem de serviço com ID ${id} não encontrada para atualização de mensagem`,
			)
		}

		if (situation.message) {
			await this.messageService.update(situation.message.id, {
				message: updateWorkOrderSituationMessageDto.message,
			})

			await this.update(id, { active: updateWorkOrderSituationMessageDto.active ?? situation.active })
			return await this.findOne(id)
		}

		const message = await this.messageService.create({ message: updateWorkOrderSituationMessageDto.message })

		if (!message) {
			this.logger.error('Falha ao criar mensagem para situação de ordem de serviço')
			throw new BadGatewayException('Falha ao criar mensagem para situação de ordem de serviço')
		}

		situation.message = message
		const updated = await this.update(situation.id, {
			message: message,
			active: updateWorkOrderSituationMessageDto.active ?? situation.active,
		})
		return updated
	}

	async getSituations() {
		return await this.taskWorkOrderService.getSituations()
	}

	async getMessageBySituation(situation: string) {
		const sit = await this.workOrderSituationRepository.findOne({
			where: { description: situation },
			relations: ['message'],
		})

		if (!sit) {
			return null
		} else if (!sit.message) {
			return null
		} else if (!sit.active) {
			return null
		}

		return sit.message
	}
}
