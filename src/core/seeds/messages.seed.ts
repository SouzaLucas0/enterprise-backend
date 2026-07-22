import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Message } from '../../features/messages/entities/message.entity'

@Injectable()
export class MessageSeed {
	private readonly logger = new Logger(MessageSeed.name)

	constructor(
		@InjectRepository(Message)
		private readonly messageRepository: Repository<Message>,
	) {}

	async run(): Promise<void> {
		const existing = await this.messageRepository.find()
		const existingCount = existing.filter((m) => m.id !== 999).length
		if (existingCount > 0) {
			return
		}

		const messages = this.messageRepository.create([
			{ message: 'Olá {{nomeCliente}}, toda a nossa equipe te deseja um feliz aniversário!' },
			{ message: 'Olá {{nomeCliente}}, segue a Nota Fiscal número: {{numeroNfe}}' },
			{ message: 'Olá {{nomeCliente}}, segue o boleto para pagamento' },
			{ message: 'Olá {{nomeCliente}}, pedido: {{numeroPedido}} no valor: {{valorLiquido}} realizada' },
		])

		await this.messageRepository.save(messages)

		this.logger.verbose('Seed de mensagens executado com sucesso')
	}
}
