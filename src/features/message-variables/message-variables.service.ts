import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { MessageVariable } from './entities/message-variable.entity'
import { CreateMessageVariableDto } from './dto/create-message-variable.dto'
import { UpdateMessageVariableDto } from './dto/update-message-variable.dto'

@Injectable()
export class MessageVariablesService {
	private readonly logger = new Logger (MessageVariablesService.name)

	constructor(
		@InjectRepository(MessageVariable)
		private readonly repository: Repository<MessageVariable>,
	) {}

	async create(dto: CreateMessageVariableDto): Promise<MessageVariable> {
		const entity = this.repository.create(dto)
		return this.repository.save(entity)
	}

	async findAll(): Promise<MessageVariable[]> {
		return this.repository.find({
			order: { id: 'ASC' },
		})
	}

	async findOne(id: number): Promise<MessageVariable> {
		const messageVariable = await this.repository.findOne({
			where: { id },
		})

		if (!messageVariable) {
			this.logger.error(`MessageVariable com id ${id} não encontrada`)
			throw new NotFoundException(`MessageVariable com id ${id} não encontrada`)
		}

		return messageVariable
	}
	
	async findByFunction(functionName: string): Promise<MessageVariable> {
		const messageVariable = await this.repository.findOne({
			where: { function: functionName },
		})

		if (!messageVariable) {
			this.logger.error(`MessageVariable com function "${functionName}" não encontrada`)
			throw new NotFoundException(`MessageVariable com function "${functionName}" não encontrada`)
		}

		return messageVariable
	}

	async update(functionName: string, dto: UpdateMessageVariableDto): Promise<MessageVariable> {
		const messageVariable = await this.findByFunction(functionName)

		Object.assign(messageVariable, dto)

		return this.repository.save(messageVariable)
	}

	async remove(id: number): Promise<{ success: boolean, message: string }> {
		const messageVariable = await this.findOne(id)

		await this.repository.remove(messageVariable)

		this.logger.error(`MessageVariable com id ${id} removida`)
		return {
			success: true,
			message: 'MessageVariable removida com sucesso',
		}
	}
}
