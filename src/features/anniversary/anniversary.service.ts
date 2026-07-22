import {
	BadGatewayException,
	BadRequestException,
	ForbiddenException,
	forwardRef,
	Inject,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { JobStatusType } from '../../@types/jobStatusType'
import { AppMetaService } from '../../core/app-meta/app-meta.service'
import { AllConfigService } from '../../core/config/all-config.service'
import { UpdateConfigDto } from '../../core/config/dto/update-config.dto'
import { NotificationsGateway } from '../../integrations/notifications/notifications.gateway'
import { WhatsappService } from '../../integrations/whatsapp/whatsapp.service'
import { TasksAnniversaryService } from '../../jobs/anniversary/anniversary-tasks.service'
import { formatContact } from '../../shared/utils/formatContact'
import { formatDate } from '../../shared/utils/formatDate'
import { formatMessage } from '../../shared/utils/formatMessage'
import { formatTimeZone } from '../../shared/utils/formatTimeZone'
import { CustomerService } from '../customer/customer.service'
import { LogsService } from '../logs/logs.service'
import { CreateSentMessageDto } from './dto/create-sent-message.dto'
import { SendAnniversaryMessageDto } from './dto/sendAnniversaryMessage.dto'
import { AnniversarySent } from './entities/anniversary-sent.entity'
import { MessagesService } from '../messages/messages.service'

@Injectable()
export class AnniversaryService {
	private readonly logger = new Logger(AnniversaryService.name)
	private readonly anniversaryConfigId = 1
	private readonly jobKey = 'anniversary'
	private readonly jobTitle = 'Aniversariantes'

	constructor(
		@InjectRepository(AnniversarySent)
		private readonly anniversarySentRepository: Repository<AnniversarySent>,
		@Inject(forwardRef(() => TasksAnniversaryService))
		private readonly tasksAnniversaryService: TasksAnniversaryService,
		private readonly whatsappService: WhatsappService,
		private readonly allConfigService: AllConfigService,
		private readonly customerService: CustomerService,
		private readonly logsService: LogsService,
		private readonly appMetaService: AppMetaService,
		private readonly notificationsGateway: NotificationsGateway,
		private readonly messagesService: MessagesService,
	) {}

	private emitStatus(patch: Partial<JobStatusType>) {
		this.notificationsGateway.updateJobStatus(this.jobKey, {
			title: this.jobTitle,
			...patch,
		})
	}

	async updateConfig(updateConfigDto: UpdateConfigDto) {
		const updated = await this.allConfigService.updateConfig(this.anniversaryConfigId, updateConfigDto)

		if (updateConfigDto.runTime) {
			this.tasksAnniversaryService.updateCronCelebrants(updated.runTime, updated.runAuto)
		}

		return updated
	}

	async findAllConfigs() {
		const whatsappConfig = await this.allConfigService.findOne(this.anniversaryConfigId)
		return whatsappConfig
	}

	async createSentMessage(createSentMessageDto: CreateSentMessageDto) {
		if (!createSentMessageDto) {
			this.logger.error('Dados da mensagem não enviados')
			throw new BadGatewayException('Dados da mensagem não enviados')
		}

		const customer = await this.customerService.findOneCustomer(createSentMessageDto.customerId.toString())

		if (!customer) {
			throw new NotFoundException(`Cliente ID: ${createSentMessageDto.customerId} não encontrado`)
		}

		if (!customer.active) {
			this.logger.warn(`Ciente ${customer.name} inativo`)
			throw new ForbiddenException(`Ciente ${customer.name} inativo`)
		}

		try {
			await this.customerService.updateCustomer(customer.id, {
				bithdaySentDate: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()),
			})
		} catch (error) {
			this.logger.error(`Erro ao atualizar bithdaySentDate do cliente ID: ${customer.id}. Erro: ${error.message}`)
			throw new BadGatewayException(
				`Erro ao atualizar bithdaySentDate do cliente ID: ${customer.id}. Erro: ${error.message}`,
			)
		}

		const sentMessage = this.anniversarySentRepository.create({
			isntance: createSentMessageDto.isntance,
			sentDate: createSentMessageDto.sentDate,
			message: createSentMessageDto.message,
			customer,
		})

		const created = await this.anniversarySentRepository.save(sentMessage)

		return created
	}

	async findAllSentMessages() {
		return await this.anniversarySentRepository.find({
			relations: ['customer'],
		})
	}

	async sendManualAnniversaryMessage(sendAnniversaryMessageDto: SendAnniversaryMessageDto) {
		const anniversaryConfig = await this.findAllConfigs()

		try {
			if (!anniversaryConfig) {
				this.logger.error(`Configurações para envio de mensagens de aniversariantes não encontradas`)
				this.emitStatus({
					running: false,
					hasError: true,
					errorMessage: 'Configurações não encontradas',
				})
				throw new NotFoundException(`Configurações para envio de mensagens de aniversariantes não encontradas`)
			}

			this.emitStatus({
				running: true,
				hasError: false,
				errorMessage: undefined,
				lastRunAt: new Date(),
			})

			const customer = await this.customerService.findOneCustomer(sendAnniversaryMessageDto.customerId)

			if (!customer) {
				this.logger.error(`Cliente id: ${sendAnniversaryMessageDto.customerId} não encontrado`)
				throw new NotFoundException(`Cliente id: ${sendAnniversaryMessageDto.customerId} não encontrado`)
			}

			if (!customer.active) {
				this.logger.warn(`Ciente ${customer.name} inativo`)
				throw new ForbiddenException(`Ciente ${customer.name} inativo`)
			}

			if (!customer.bithday) {
				this.logger.warn(`Ciente ${customer.name} não tem data de nascimento no cadastro`)
				return false
			}

			const whatsAppClientID = anniversaryConfig.runInstance

			if (whatsAppClientID === '') {
				this.logger.error('Envio não realizado, adicione uma conta de WhatsApp!')
				this.emitStatus({
					running: false,
					hasError: true,
					errorMessage: 'Nenhuma conta WhatsApp configurada',
				})
				throw new BadRequestException(`Envio não realizado, adicione uma conta de WhatsApp!`)
			}

			const messageVars = {
				nomeEmpresa: customer.company,
				nomeCliente: customer.name,
				foneCliente: customer.contact,
				dataNascimento: formatDate(customer.bithday.toString()),
			}

			const contactFormated = `55${formatContact(customer.contact)}`

			if (customer.firstMessageSent === false) {
				const welcomeMessageVars = {
					nomeEmpresa: customer.company,
					nomeCliente: customer.name,
				}

				const welcomeMessage = await this.findWelcomeMessage()
				const mensagemFormated = formatMessage(welcomeMessage!.message, welcomeMessageVars)

				const sent = await this.whatsappService.sendMessage({
					clientId: whatsAppClientID,
					number: contactFormated,
					message: mensagemFormated,
				})

				if (sent.success) {
					this.logger.log(`Mensagem de boas-vindas enviada para ${customer.name}`)
					await this.customerService.updateCustomer(customer.id, { firstMessageSent: true })

					await new Promise((resolve) => setTimeout(resolve, 20_000))
				} else {
					this.logger.error(sent.error)
				}
			}

			const mensagemFormated = formatMessage(sendAnniversaryMessageDto.message, messageVars)

			const sent = await this.whatsappService.sendMessage({
				clientId: whatsAppClientID,
				number: contactFormated,
				message: mensagemFormated,
			})

			if (sent.success) {
				await this.createSentMessage({
					customerId: sendAnniversaryMessageDto.customerId,
					isntance: sendAnniversaryMessageDto.clientId,
					sentDate: formatTimeZone(new Date()),
					message: sendAnniversaryMessageDto.message,
				})

				await this.customerService.updateCustomer(sendAnniversaryMessageDto.customerId, {
					bithdaySentDate: formatTimeZone(new Date()),
				})

				this.logger.log(`Mensagem enviada para: ${customer.name}`)

				await this.appMetaService.increment('anniversary_sent_count')
				const totalSents = await this.appMetaService.get('anniversary_sent_count')

				this.emitStatus({
					running: false,
					lastSyncAt: new Date(),
					sentCount: Number(totalSents) || 0,
				})

				return { success: true, sent }
			} else {
				this.emitStatus({
					running: false,
					hasError: true,
					errorMessage: sent.error,
				})
				if (sent?.error && sent.error.includes('is not on WhatsApp')) {
					this.logsService.createLog({
						customerId: customer.id,
						whatsappNumber: customer.contact,
						module: AnniversaryService.name,
						obs: 'O contato não tem WhatsApp, verifique o cadastro do cliente.',
					})

					this.customerService.disableCustomer(customer.id)

					return {
						success: false,
						message: `O contato não tem WhatsApp, verifique o cadastro do cliente. Cliente ${customer.name} inativado!`,
					}
				}
			}

			this.emitStatus({
				running: false,
				hasError: true,
				errorMessage: sent.error,
			})

			return { success: false, message: 'Falha ao enviar mensagem.' }
		} catch (err) {
			this.logger.error(`Erro ao enviar mensagem de aniversário: ${err.message}`)
			this.emitStatus({
				running: false,
				hasError: true,
				errorMessage: err.message,
			})
			throw new BadGatewayException(`Erro ao enviar mensagem de aniversário: ${err.message}`)
		}
	}

	async findWelcomeMessage() {
		const message = await this.messagesService.findOne(999)
		return message
	}

	async findBirthdayCelebrants() {
		const birthdayCelebrants = await this.customerService.findBirthdayCustomers()

		if (!birthdayCelebrants || birthdayCelebrants.length === 0) {
			return []
		}

		return birthdayCelebrants
	}

	async runManualFirebird() {
		return await this.tasksAnniversaryService.manualChargeQuery()
	}
}
