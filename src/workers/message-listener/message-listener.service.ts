import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { CustomerService } from '../../features/customer/customer.service'
import { LogsService } from '../../features/logs/logs.service'
import { WhatsappInstanceService } from '../../integrations/whatsapp/whatsapp-instance.service'
import { WhatsappService } from '../../integrations/whatsapp/whatsapp.service'
import { formatContact } from '../../shared/utils/formatContact'

const EventSourceImpl = require('eventsource')
const EventSource = EventSourceImpl.EventSource || EventSourceImpl

interface WhatsAppMessage {
	type?: string
	EventType?: string
	body?: string
	text?: string
	from?: string
	key?: {
		remoteJid?: string
		fromMe?: boolean
		id?: string
	}
	pushName?: string
	[key: string]: any
}

@Injectable()
export class MessageListenerService implements OnModuleInit, OnApplicationShutdown {
	private readonly logger = new Logger(MessageListenerService.name)
	private readonly stopKeywords = ['parar envios', 'parar envio', 'cancelar', 'stop', 'parar mensagens']
	private readonly validStatuses = ['connected', 'connecting']
	private activeConnections: Map<string, EventSource> = new Map()

	private isOwnMessage(message: WhatsAppMessage): boolean {
		return message.key?.fromMe === true || (message as any).message?.fromMe === true
	}

	constructor(
		private readonly whatsappInstanceService: WhatsappInstanceService,
		private readonly whatsappService: WhatsappService,
		private readonly customerService: CustomerService,
		private readonly logService: LogsService,
	) {}

	private isValidStatus(status: string): boolean {
		return this.validStatuses.includes(status)
	}

	async onModuleInit() {
		this.logger.log('Iniciando Message Listener Worker...')
		await this.startListeningAllInstances()
	}

	async onApplicationShutdown() {
		this.logger.log('Encerrando Message Listener Worker...')
		this.stopAllConnections()
	}

	@Cron(CronExpression.EVERY_5_MINUTES, {
		name: 'sync-whatsapp-instances',
	})
	async syncInstances() {
		this.logger.debug('Sincronizando instâncias com o banco de dados...')

		try {
			const instances = await this.whatsappInstanceService.findAll()
			const dbClientIds = new Set(instances.filter((i) => this.isValidStatus(i.status)).map((i) => i.clientId))

			for (const clientId of this.activeConnections.keys()) {
				if (!dbClientIds.has(clientId)) {
					this.logger.log(`Removendo instância ${clientId} (não encontrada ou desconectada no banco)`)
					this.stopConnection(clientId)
				}
			}

			for (const instance of instances) {
				if (this.isValidStatus(instance.status) && !this.activeConnections.has(instance.clientId)) {
					this.logger.log(`Nova instância detectada: ${instance.clientId}`)
					await this.startSSEConnection(instance.clientId, instance.token)
				}
			}

			this.logger.debug(`Status: ${this.activeConnections.size} conexão(ões) ativa(s)`)
		} catch (error) {
			this.logger.error('Erro ao sincronizar instâncias', error)
		}
	}

	private async startListeningAllInstances() {
		try {
			const instances = await this.whatsappInstanceService.findAll()

			if (instances.length === 0) {
				this.logger.warn('Nenhuma instância do WhatsApp encontrada')
				return
			}

			this.logger.log(`${instances.length} instância(s) encontrada(s)`)

			for (const instance of instances) {
				if (this.isValidStatus(instance.status)) {
					await this.startSSEConnection(instance.clientId, instance.token)
				} else {
					this.logger.debug(`Instância ${instance.clientId} não está conectada (status: ${instance.status})`)
				}
			}
		} catch (err) {
			this.logger.error('Erro ao buscar instâncias do WhatsApp', err)
		}
	}

	private async startSSEConnection(clientId: string, token: string) {
		this.stopConnection(clientId)

		const uazapiUrl = process.env.UAZAPIURL
		const url = `${uazapiUrl}sse?token=${token}&events=chats,messages`

		this.logger.log(`Conectando SSE para instância ${clientId}...`)

		try {
			const eventSource = new EventSource(url)

			eventSource.onopen = () => {
				this.logger.log(`SSE conectado para instância ${clientId}`)
			}

			eventSource.onmessage = (event) => {
				try {
					const message = JSON.parse(event.data)
					this.handleMessage(clientId, message)
				} catch (error) {
					this.logger.debug(`Erro ao parsear mensagem SSE: ${error}`)
				}
			}

			eventSource.onerror = () => {
				this.logger.warn(`Erro/Desconexão na conexão SSE para instância ${clientId}`)
				eventSource.close()
				this.activeConnections.delete(clientId)

				setTimeout(async () => {
					const instance = await this.whatsappInstanceService.findOne(clientId)

					if (instance && this.isValidStatus(instance.status)) {
						this.logger.log(`Tentando reconectar instância ${clientId}...`)
						await this.startSSEConnection(clientId, token)
					} else {
						this.logger.debug(
							`Instância ${clientId} não será reconectada (${!instance ? 'removida' : 'desconectada'})`,
						)
					}
				}, 30000)
			}

			this.activeConnections.set(clientId, eventSource)
		} catch (error: any) {
			this.logger.error(`Erro ao conectar SSE para instância ${clientId}:`, error.message)
		}
	}

	private async handleMessage(clientId: string, message: WhatsAppMessage) {
		const eventType = message.type || message.EventType

		if (!eventType || eventType === 'connection') {
			return
		}

		if (eventType !== 'message' && eventType !== 'messages') {
			return
		}

		if (this.isOwnMessage(message)) {
			return
		}

		let messageText = ''

		if (message.body) {
			messageText = message.body
		} else if (message.text) {
			messageText = message.text
		} else if ((message as any).message?.body) {
			messageText = (message as any).message.body
		} else if ((message as any).message?.text) {
			messageText = (message as any).message.text
		}

		if (!messageText) {
			return
		}

		const textLower = messageText.toLowerCase().trim()

		const shouldStop = this.stopKeywords.some((keyword) => textLower.includes(keyword))

		if (shouldStop) {
			let phoneNumber = ''

			if ((message as any).message?.chatid) {
				let clean = (message as any).message.chatid.replace(/@.*$/, '')

				clean = clean.replace(/^55/, '')

				clean = clean.substring(0, 2) + '9' + clean.substring(2)
				if (clean) phoneNumber = clean
			}

			try {
				const customers = await this.customerService.findByPhoneNumber(phoneNumber)

				if (customers.length === 0) {
					this.logger.warn(`Nenhum cliente encontrado com número: ${phoneNumber}`)
					return
				}

				for (const customer of customers) {
					if (!customer.active) continue

					await this.whatsappService.sendMessage({
						clientId: clientId,
						number: formatContact( customer.contact),
						message: `Olá ${customer.name}, recebemos sua solicitação para não receber mais mensagens, você não será incomodado(a) novamente. Obrigado!`,
					})

					await this.customerService.disableCustomer(customer.id)
					await this.logService.createLog({
						customerId: customer.id,
						whatsappNumber: phoneNumber,
						module: 'whatsapp',
						obs: `Cliente: ${customer.name} com telefone ${phoneNumber} desativado por solicitação de parada de envio de mensagens (Instância: ${clientId})`,
					})

					this.logger.warn(
						`Cliente: ${customer.name} com telefone ${phoneNumber} desativado por solicitação de parada de envio de mensagens (Instância: ${clientId})`,
					)
				}
			} catch (error) {
				this.logger.error(`Erro ao processar parada para telefone ${phoneNumber}:`, error)
			}
		}
	}

	private extractPhoneNumber(whatsappId: string): string {
		if (!whatsappId) return ''

		const clean = whatsappId.replace(/@.*$/, '')
		return clean || ''
	}

	private formatPhoneNumber(phone: string): string {
		if (!phone) return ''

		const clean = phone.replace(/\D/g, '')

		return clean.replace(/^55/, '')
	}

	stopConnection(clientId: string) {
		const eventSource = this.activeConnections.get(clientId)
		if (eventSource) {
			eventSource.close()
			this.activeConnections.delete(clientId)
			this.logger.log(`Conexão SSE parada para instância ${clientId}`)
		}
	}

	stopAllConnections() {
		this.logger.log('Parando todas as conexões SSE...')
		for (const [clientId, eventSource] of this.activeConnections.entries()) {
			eventSource.close()
		}
		this.activeConnections.clear()
	}

	async addInstance(clientId: string, token: string) {
		this.logger.log(`Adicionando nova instância para monitoramento: ${clientId}`)
		await this.startSSEConnection(clientId, token)
	}
}
