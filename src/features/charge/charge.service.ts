import {
	BadGatewayException,
	BadRequestException,
	ForbiddenException,
	forwardRef,
	Inject,
	Injectable,
	InternalServerErrorException,
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
import { TasksChargeService } from '../../jobs/charge/charge-task.service'
import { calculateInterest, calculatePenalty } from '../../shared/utils/calculateInterestAndPenalty'
import { formatContact } from '../../shared/utils/formatContact'
import { formatDate } from '../../shared/utils/formatDate'
import { formatMessage } from '../../shared/utils/formatMessage'
import { formatTimeZone } from '../../shared/utils/formatTimeZone'
import { CustomerService } from '../customer/customer.service'
import { LogsService } from '../logs/logs.service'
import { MessagesService } from '../messages/messages.service'
import { CreateChargeRoleDto } from './dto/create-charge-role.dto'
import { CreateChargeDto } from './dto/create-charge.dto'
import { SendManualMessageDto } from './dto/send-manual-charge-message.dto'
import { UpdateChargeRoleDto } from './dto/update-charge-role.dto'
import { UpdateChargeDto } from './dto/update-charge.dto'
import { Charge } from './entities/charge.entity'
import { ChargeRole } from './entities/chargeRole.entity'

@Injectable()
export class ChargeService {
	private readonly logger = new Logger(ChargeService.name)
	private readonly chargeConfigId = 2
	private readonly jobKey = 'charge'
	private readonly jobTitle = 'Cobranças'

	constructor(
		@InjectRepository(Charge)
		private readonly chargeRepository: Repository<Charge>,
		@InjectRepository(ChargeRole)
		private readonly chargeRoleRepository: Repository<ChargeRole>,
		@Inject(forwardRef(() => TasksChargeService))
		private readonly chargeTaskService: TasksChargeService,
		private readonly customerService: CustomerService,
		private readonly allConfigService: AllConfigService,
		private readonly messagesService: MessagesService,
		private readonly whatsappService: WhatsappService,
		private readonly logsService: LogsService,
		private readonly appMetaService: AppMetaService,
		private readonly notificationsGateway: NotificationsGateway,
	) {}

	private emitStatus(patch: Partial<JobStatusType>) {
		this.notificationsGateway.updateJobStatus(this.jobKey, {
			title: this.jobTitle,
			...patch,
		})
	}

	async createCharge(createChargeDto: CreateChargeDto) {
		const exist = await this.findOneCharge(createChargeDto.id)

		if (exist) {
			await this.updateCharge(createChargeDto.id, {
				expiration: createChargeDto.expiration,
				value: createChargeDto.value,
				installment: createChargeDto.installment,
				qtdInstallments: createChargeDto.qtdInstallments,
				type: createChargeDto.type,
				paymentDate: createChargeDto.paymentDate,
				interest: createChargeDto.interest,
				interestType: createChargeDto.interestType,
				fine: createChargeDto.fine,
				company: createChargeDto.company,
			})
			return
		}

		if (!createChargeDto) {
			this.logger.error('Dados de cobrança não enviados')
			throw new Error('Dados de cobrança não enviados')
		}

		const customer = await this.customerService.findOneCustomer(createChargeDto.customerId)

		if (!customer) {
			this.logger.error(`Cliente ID: ${createChargeDto.customerId} não encontrado`)
			throw new Error(`Cliente ID: ${createChargeDto.customerId} não encontrado`)
		}

		if (!customer.active) {
			this.logger.warn(`Ciente ${customer.name} inativo`)
			throw new ForbiddenException(`Ciente ${customer.name} inativo`)
		}

		const charge = this.chargeRepository.create({
			id: createChargeDto.id,
			expiration: createChargeDto.expiration,
			value: createChargeDto.value,
			installment: createChargeDto.installment,
			qtdInstallments: createChargeDto.qtdInstallments,
			type: createChargeDto.type,
			paymentDate: createChargeDto.paymentDate,
			qtdSents: createChargeDto.qtdSents,
			fine: createChargeDto.fine,
			interest: createChargeDto.interest,
			interestType: createChargeDto.interestType,
			company: createChargeDto.company,
			customer,
		})

		if (createChargeDto.paymentDate !== null) {
			charge.active = false
		} else {
			charge.active = true
		}

		const created = await this.chargeRepository.save(charge)

		return created
	}

	async findAllCharge() {
		const charges = await this.chargeRepository.find({
			relations: ['customer'],
		})

		const returnCharges = charges.map((charge) => ({
			...charge,
			value: Number(charge.value).toFixed(2),
		}))

		return returnCharges.filter((chager) => chager.active !== false)
	}

	async findAllChargeToFront() {
		const charges = await this.chargeRepository.find({
			relations: ['customer'],
		})

		const returnCharges = charges.map((charge) => {
			const interest = calculateInterest(
				Number(charge.value),
				charge.expiration,
				charge.interest,
				new Date(),
				charge.interestType,
			)

			const penalty = calculatePenalty(Number(charge.value), charge.expiration, charge.fine, new Date())

			return {
				...charge,
				value: Number(charge.value).toFixed(2),
				interest,
				fine: penalty,
			}
		})

		return returnCharges.filter((chager) => chager.active !== false)
	}

	async findOneCharge(id: string) {
		if (!id) {
			this.logger.error('ID da cobrança não fornecido')
		}

		const charge = await this.chargeRepository.findOne({
			where: { id: id },
			relations: ['customer'],
		})

		return charge
	}

	async updateCharge(id: string, updateChargeDto: UpdateChargeDto) {
		if (!id) {
			this.logger.error('ID da cobrança não enviado')
			throw new Error('ID da cobrança não enviado')
		}

		if (!updateChargeDto) {
			this.logger.error('Dados para atualização não enviados')
			throw new Error('Dados para atualização não enviados')
		}

		const charge = await this.findOneCharge(id)

		if (!charge) {
			throw new Error(`Cobrança ID: ${id} não encontrada`)
		}

		charge.expiration = updateChargeDto.expiration ? new Date(updateChargeDto.expiration) : charge.expiration
		charge.value = updateChargeDto.value ?? charge.value
		charge.installment = updateChargeDto.installment ?? charge.installment
		charge.qtdInstallments = updateChargeDto.qtdInstallments ?? charge.qtdInstallments
		charge.type = updateChargeDto.type ?? charge.type
		charge.qtdSents = updateChargeDto.qtdSents ?? charge.qtdSents
		charge.lastSentDate = updateChargeDto.lastSentDate ?? charge.lastSentDate
		charge.paymentDate = updateChargeDto.paymentDate ?? charge.paymentDate
		charge.active = updateChargeDto.active ?? charge.active
		charge.interest = updateChargeDto.interest ?? charge.interest
		charge.interestType = updateChargeDto.interestType ?? charge.interestType
		charge.fine = updateChargeDto.fine ?? charge.fine
		charge.company = updateChargeDto.company ?? charge.company

		if ('lastChargeRoleId' in updateChargeDto) {
			charge.lastChargeRoleId = updateChargeDto.lastChargeRoleId
		}

		const updated = await this.chargeRepository.save(charge)

		return updated
	}

	async remove(id: string) {
		if (!id) {
			this.logger.error('ID da cobrança não enviado')
			throw new Error('ID da cobrança não enviado')
		}
		const charge = await this.findOneCharge(id)

		if (!charge) {
			throw new Error(`Cobrança ID: ${id} não encontrada`)
		}

		charge.active = false

		const removed = await this.chargeRepository.save(charge)

		return removed
	}

	async createChargeRole(createChargeRoleDto: CreateChargeRoleDto) {
		if (!createChargeRoleDto) {
			this.logger.error('Dados de regra de cobrança não enviados')
			throw new Error('Dados de regra de cobrança não enviados')
		}

		const message = await this.messagesService.create({ message: createChargeRoleDto.message })

		const chargeRole = this.chargeRoleRepository.create({
			description: createChargeRoleDto.description,
			qtdDaysLate: createChargeRoleDto.qtdDaysLate,
			sendBol: createChargeRoleDto.sendBol,
			active: createChargeRoleDto.active,
			autoSend: createChargeRoleDto.autoSend,
			message,
		})

		const created = await this.chargeRoleRepository.save(chargeRole)

		this.logger.log(`Regra de cobrança criada: ${created.description}`)

		return created
	}

	async findAllChargeRoles() {
		const chargeRoles = await this.chargeRoleRepository.find({
			relations: ['message'],
		})
		return chargeRoles.filter((chargeRole) => chargeRole.active !== false)
	}

	async findOneChargeRole(id: number) {
		if (!id) {
			this.logger.error('ID da regra de cobrança não fornecido')
			throw new NotFoundException('ID da regra de cobrança não fornecido')
		}

		const chargeRole = await this.chargeRoleRepository.findOne({
			where: { id },
			relations: ['message'],
		})

		if (!chargeRole) {
			throw new NotFoundException(`Regra de cobrança ID: ${id} não encontrada`)
		}

		return chargeRole
	}

	async updateChargeRole(id: number, updateChargeRoleDto: UpdateChargeRoleDto) {
		if (!id) {
			this.logger.error('ID da regra de cobrança não enviado')
			throw new Error('ID da regra de cobrança não enviado')
		}

		if (!updateChargeRoleDto) {
			this.logger.error('Dados para atualização não enviados')
			throw new Error('Dados para atualização não enviados')
		}

		const chargeRole = await this.findOneChargeRole(id)

		if (!chargeRole) {
			throw new Error(`Regra de cobrança ID: ${id} não encontrada`)
		}

		if (updateChargeRoleDto.message) {
			const messageModel = await this.messagesService.findOne(chargeRole.message.id)
			if (!messageModel) {
				this.logger.error(`Mensagem ID: ${updateChargeRoleDto.messageId} não encontrada`)
				throw new Error(`Mensagem ID: ${updateChargeRoleDto.messageId} não encontrada`)
			}

			messageModel.message = updateChargeRoleDto.message ?? messageModel.message

			await this.messagesService.update(messageModel.id, { message: messageModel.message })
		}

		chargeRole.description = updateChargeRoleDto.description ?? chargeRole.description
		chargeRole.qtdDaysLate = updateChargeRoleDto.qtdDaysLate ?? chargeRole.qtdDaysLate
		chargeRole.sendBol = updateChargeRoleDto.sendBol ?? chargeRole.sendBol
		chargeRole.active = updateChargeRoleDto.active ?? chargeRole.active
		chargeRole.autoSend = updateChargeRoleDto.autoSend ?? chargeRole.autoSend

		const updated = await this.chargeRoleRepository.save(chargeRole)

		return updated
	}

	async removeChargeRole(id: number) {
		if (!id) {
			this.logger.error('ID da regra de cobrança não enviado')
			throw new BadRequestException('ID da regra de cobrança não enviado')
		}

		const chargeRole = await this.findOneChargeRole(id)

		if (!chargeRole) {
			throw new BadGatewayException(`Regra de cobrança ID: ${id} não encontrada`)
		}

		chargeRole.active = false

		await this.chargeRoleRepository.save(chargeRole)

		return { succes: true, message: `Regra de cobrança ID: ${id} removida com sucesso` }
	}

	async updateConfig(updateConfigDto: UpdateConfigDto) {
		try {
			const updated = await this.allConfigService.updateConfig(this.chargeConfigId, updateConfigDto)

			if (updateConfigDto.runTime || updateConfigDto.runAuto) {
				this.chargeTaskService.updateCronGetClients(updated.runTime, updated.runAuto)
			}

			return updated
		} catch (err) {
			throw new InternalServerErrorException(`${err}`)
		}
	}

	async findAllConfigs() {
		const chargeConfig = await this.allConfigService.findOne(this.chargeConfigId)
		return chargeConfig
	}

	async findWelcomeMessage() {
		const message = await this.messagesService.findOne(999)
		return message
	}

	async sendManualChargeMsg(sendManualMessageDto: SendManualMessageDto) {
		try {
			this.emitStatus({
				running: true,
				hasError: false,
				errorMessage: undefined,
				lastRunAt: new Date(),
			})

			const chargeConfig = await this.findAllConfigs()

			if (!chargeConfig) {
				this.logger.error(`Configurações para envio de mensagens de cobranças não encontradas`)
				this.emitStatus({
					running: false,
					hasError: true,
					errorMessage: 'Configurações não encontradas',
				})
				throw new NotFoundException(`Configurações para envio de mensagens de cobranças não encontradas`)
			}

			const charge = await this.findOneCharge(sendManualMessageDto.chargeId)

			const whatsAppClientID = chargeConfig.runInstance

			if (whatsAppClientID === '') {
				this.logger.error('Envio não realizado, adicione uma conta de WhatsApp!')
				this.emitStatus({
					running: false,
					hasError: true,
					errorMessage: 'Nenhuma conta WhatsApp configurada',
				})
				throw new BadRequestException(`Envio não realizado, adicione uma conta de WhatsApp!`)
			}

			if (!charge) {
				throw new NotFoundException(`Cobrança ID: ${sendManualMessageDto.chargeId} não encontrada`)
			}
			const msPerDay = 24 * 60 * 60 * 1000
			const now = new Date()

			const chargesRoles = await this.findAllChargeRoles()
			const sortedRoles = (chargesRoles || [])
				.slice()
				.sort((a, b) => Number(a.qtdDaysLate) - Number(b.qtdDaysLate))

			const expirationDate = new Date(charge.expiration)
			const daysLate = Math.floor((now.getTime() - expirationDate.getTime()) / msPerDay)

			//TODO: extrair regra de negócio para função separada

			let matchedRole: ChargeRole | null = null

			for (let i = 0; i < sortedRoles.length; i++) {
				const currentRole = sortedRoles[i]
				const nextRole = sortedRoles[i + 1]
				const currentDays = Number(currentRole.qtdDaysLate)
				const nextDays = nextRole ? Number(nextRole.qtdDaysLate) : Infinity

				if (daysLate >= currentDays && daysLate < nextDays) {
					matchedRole = currentRole
				}
			}

			const interest = calculateInterest(
				Number(charge.value),
				charge.expiration,
				charge.interest,
				new Date(),
				charge.interestType,
			)

			const fine = calculatePenalty(Number(charge.value), charge.expiration, charge.fine, new Date())

			if (matchedRole) {
				const messageVars = {
					nomeEmpresa: charge.company,
					nomeCliente: charge.customer.name,
					diasAtraso: daysLate,
					valorPendente: Number(charge.value).toFixed(2),
					valorTotal: Number(interest + fine + Number(charge.value)).toFixed(2),
					vencimento: formatDate(charge.expiration.toString()),
					parcela: charge.installment,
					qtdParcelas: charge.qtdInstallments,
					tipoDocumento: charge.type,
					qtdCobrancas: charge.qtdSents,
					numeroDocumento: charge.id,
					juros: interest.toFixed(2),
					multa: fine.toFixed(2),
				}				

				const contactFormated = `55${formatContact(charge.customer.contact)}`

				if (charge.customer.firstMessageSent === false) {
					const welcomeMessageVars = {
						nomeEmpresa: charge.company,
						nomeCliente: charge.customer.name,
					}

					const welcomeMessage = await this.findWelcomeMessage()
					const mensagemFormated = formatMessage(welcomeMessage!.message, welcomeMessageVars)

					const sent = await this.whatsappService.sendMessage({
						clientId: whatsAppClientID,
						number: contactFormated,
						message: mensagemFormated,
					})

					if (sent.success) {
						this.logger.log(`Mensagem de boas-vindas enviada para ${charge.customer.name}`)
						await this.customerService.updateCustomer(charge.customer.id, { firstMessageSent: true })

						await new Promise((resolve) => setTimeout(resolve, 20_000))
					} else {
						this.logger.error(sent.error)
					}
				}

				const mensagemFormated = formatMessage(matchedRole.message.message, messageVars)

				const sent = await this.whatsappService.sendMessage({
					clientId: whatsAppClientID,
					number: contactFormated,
					message: mensagemFormated,
				})

				if (sent.success) {
					await this.updateCharge(charge.id, {
						lastSentDate: formatTimeZone(new Date()),
						qtdSents: charge.qtdSents + 1,
					})

					this.logger.log(`Cobrança id: ${charge.id} enviada manualmente para ${charge.customer.name}`)

					await this.appMetaService.increment('charge_sent_count')
					const totalSents = await this.appMetaService.get('charge_sent_count')

					this.emitStatus({
						running: false,
						lastSyncAt: new Date(),
						sentCount: Number(totalSents) || 0,
					})

					return { success: true, message: `Mensagem enviada com sucesso` }
				} else {
					if (sent?.error && sent.error.includes('is not on WhatsApp')) {
						this.logsService.createLog({
							customerId: charge.customer.id,
							whatsappNumber: charge.customer.contact,
							module: ChargeService.name,
							obs: 'O contato não tem WhatsApp, verifique o cadastro do cliente.',
						})

						this.customerService.disableCustomer(charge.customer.id)
						this.emitStatus({ running: false })

						return {
							success: false,
							message: `O contato não tem WhatsApp, verifique o cadastro do cliente. Cliente ${charge.customer.name} inativado!`,
						}
					}
					this.logger.error(`Erro ao enviar mensagem de cobrança: ${sent.error}`)
					this.emitStatus({
						running: false,
						hasError: true,
						errorMessage: sent.error,
					})

					return { success: false, message: `${sent.error}` }
				}
			} else {
				this.logger.error(`Nenhuma regra de cobrança se encaixa em ${daysLate} dias de atraso`)

				this.emitStatus({
					running: false,
					hasError: true,
					errorMessage: `Nenhuma regra de cobrança se encaixa em ${daysLate} dias de atraso`,
				})

				return {
					success: false,
					message: `Nenhuma regra de cobrança se encaixa em ${daysLate} dias de atraso`,
				}
			}
		} catch (err) {
			this.logger.error(`Erro ao enviar mensagem de cobrança: ${err}`)
			this.emitStatus({
				running: false,
				hasError: true,
				errorMessage: err instanceof Error ? err.message : 'Erro desconhecido',
			})
			throw new InternalServerErrorException(`${err}`)
		}
	}

	async runManualFirebird() {
		return await this.chargeTaskService.manualChargeQuery()
	}
}
