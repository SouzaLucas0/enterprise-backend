import {
	Injectable,
	Logger,
	BadRequestException,
	NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Message } from './entities/message.entity'
import { CreateMessageDto } from './dto/create-message.dto'
import { UpdateMessageDto } from './dto/update-message.dto'

@Injectable()
export class MessagesService {
	private readonly logger = new Logger(MessagesService.name)

	constructor(
		@InjectRepository(Message)
		private readonly messageRepository: Repository<Message>,
	) {}

	async create(createMessageDto: CreateMessageDto) {
		if (!createMessageDto) {
			this.logger.error('Falha ao criar: mensagem ausente.')
			throw new BadRequestException('Falha ao criar: mensagem ausente.')
		}

		const message = this.messageRepository.create(createMessageDto)
		const saved = await this.messageRepository.save(message)

		this.logger.log(`Mensagem criada com ID ${saved.id}`)
		return saved
	}

	async findAll() {
		return await this.messageRepository.find()
	}

	async findOne(id: number) {
		if (!id) {
			this.logger.error('Falha ao buscar: ID não informado.')
			throw new BadRequestException('Falha ao buscar: ID não informado.')
		}

		const message = await this.messageRepository.findOne({ where: { id } })

		if (!message) {
			this.logger.error(`Mensagem ID ${id} não encontrada.`)
		}

		return message
	}

	async update(id: number, updateMessageDto: UpdateMessageDto) {
		if (!id) {
			this.logger.error('Falha ao atualizar: ID não informado.')
			throw new BadRequestException(
				'Falha ao atualizar: ID não informado.',
			)
		}

		if (!updateMessageDto || !updateMessageDto.message) {
			this.logger.error('Falha ao atualizar: mensagem ausente.')
			throw new BadRequestException(
				'Falha ao atualizar: mensagem ausente.',
			)
		}

		const exists = await this.findOne(id)

		if (exists) {
			await this.messageRepository.update(id, updateMessageDto)
			this.logger.log(`Mensagem ID ${id} atualizada.`)
		} else {
			const create: CreateMessageDto = {
				message: updateMessageDto.message,
			}

			await this.create(create)
		}

		return updateMessageDto
	}

	async remove(id: number) {
		if (!id) {
			this.logger.error('Falha ao remover: ID não informado.')
			throw new BadRequestException('Falha ao remover: ID não informado.')
		}

		const exists = await this.findOne(id)

		this.logger.warn(`Removendo mensagem ID: ${id}`)
		return await this.messageRepository.delete(id)
	}
}
