import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import { CronJob } from 'cron'
import { JobStatusType } from '../../@types/jobStatusType'
import { AppMetaService } from '../../core/app-meta/app-meta.service'
import { AnniversaryService } from '../../features/anniversary/anniversary.service'
import { CustomerService } from '../../features/customer/customer.service'
import { LogsService } from '../../features/logs/logs.service'
import { MessagesService } from '../../features/messages/messages.service'
import { FirebirdService } from '../../integrations/firebird/firebird.service'
import { NotificationsGateway } from '../../integrations/notifications/notifications.gateway'
import { WhatsappService } from '../../integrations/whatsapp/whatsapp.service'
import { formatContact } from '../../shared/utils/formatContact'
import { formatDate } from '../../shared/utils/formatDate'
import { formatMessage } from '../../shared/utils/formatMessage'
import { formatTimeZone } from '../../shared/utils/formatTimeZone'

@Injectable()
export class TasksAnniversaryService {
	private readonly logger = new Logger(`Envio de mensagem de aniverário`)
	private readonly cronGetCelebrantsName = 'cron-get-celebrants'
	private readonly idMessage = 1
	private readonly jobKey = 'anniversary'
	private readonly jobTitle = 'Aniversariantes'
	private lastEnabled = false
	private resultMessage: string

	constructor(
		private readonly fb: FirebirdService,
		@Inject(forwardRef(() => AnniversaryService))
		private readonly anniversaryService: AnniversaryService,
		private readonly whatsappService: WhatsappService,
		private readonly messagesService: MessagesService,
		private readonly schedulerRegistry: SchedulerRegistry,
		private readonly customerService: CustomerService,
		private readonly logsService: LogsService,
		private readonly notificationsGateway: NotificationsGateway,
		private readonly appMetaService: AppMetaService,
	) {}

	private emitStatus(patch: Partial<JobStatusType>) {
		this.notificationsGateway.updateJobStatus(this.jobKey, {
			title: this.jobTitle,
			enabled: this.lastEnabled,
			...patch,
		})
	}

	async onModuleInit() {
		let runConfig = await this.anniversaryService.findAllConfigs()

		if (!runConfig) {
			this.logger.error(`Configuraçõs para envio de mensagens aos aniveráriantes não encontradas`)
			this.logger.warn(`Criando configuraçoes padrões`)

			const defaultConfig = await this.anniversaryService.updateConfig({
				runAuto: false,
				runTime: '09:00',
				runFirebird: '08:00',
			})

			runConfig = defaultConfig
		}

		this.updateCronCelebrants(runConfig.runTime, runConfig.runAuto)
		this.lastEnabled = runConfig.runAuto
		this.emitStatus({ running: false, hasError: false })
	}

	private normalizeTimeFormat(time: string): string {
		const parts = time.split(':')
		if (parts.length === 3) {
			return `${parts[0]}:${parts[1]}`
		}
		return time
	}

	private convertTimeToCron(time: string) {
		const normalizedTime = this.normalizeTimeFormat(time)
		const [hour, minute] = normalizedTime.split(':')
		return `${minute} ${hour} * * *`
	}

	updateCronCelebrants(time: string, runAuto: boolean) {
		const normalizedTime = this.normalizeTimeFormat(time)
		const cron = this.convertTimeToCron(time)

		try {
			this.schedulerRegistry.deleteCronJob(this.cronGetCelebrantsName)
		} catch {}

		const job = new CronJob(cron, () => this.queryBirthdayCelebrants(false), null, false, 'America/Manaus')
		this.schedulerRegistry.addCronJob(this.cronGetCelebrantsName, job)
		job.start()

		this.logger.debug(`Envio de mensagem agendado para ${normalizedTime}`)
		this.logger.debug(`Envio automamatico: ${runAuto ? `Ativado` : `Desativado`}`)

		this.lastEnabled = runAuto ?? this.lastEnabled
		this.emitStatus({ enabled: this.lastEnabled })
	}

	async manualChargeQuery() {
		await this.queryBirthdayCelebrants(true)
		return { message: this.resultMessage }
	}

	async queryBirthdayCelebrants(manualQuery: boolean) {
		this.logger.warn('Executando consulta de aniversáriantes no Firebird')

		const result = await this.fb.query(`
   		SELECT
        	EMP.NOMEFANTASIA,
			c.CODIGO,
			c.NOME,
			c.FONE,
			p.DATANASC
		FROM TRECCLIENTEGERAL c
		LEFT OUTER JOIN TRECPFISICA p ON (p.CODIGO = c.CODIGO)
		LEFT OUTER JOIN treccliente CLI ON (CLI.codigo = C.codigo)
		LEFT OUTER JOIN tgerempresa EMP ON (EMP.codigo = CLI.empresa)
		WHERE c.CODIGO NOT IN (88888, 99999, 99997, 99998)
			AND EXTRACT(DAY FROM p.DATANASC) = EXTRACT(DAY FROM CURRENT_DATE)
			AND EXTRACT(MONTH FROM p.DATANASC) = EXTRACT(MONTH FROM CURRENT_DATE)
    `)

		if (result.length > 0) {
			for (const customer of result) {
				let birthdayCelebrants = await this.customerService.findOneCustomer(customer.CODIGO)

				if (!birthdayCelebrants) {
					birthdayCelebrants = await this.customerService.createCustomer({
						id: customer.CODIGO,
						name: customer.NOME,
						contact: customer.FONE,
						bithday: customer.DATANASC,
						lastPurchaseDate: new Date('1900-01-01T04:00:00.000Z'),
						lastPurchaseValue: 0,
						company: customer.NOMEFANTASIA,
					})
				} else {
					await this.customerService.updateCustomer(customer.CODIGO, {
						name: customer.NOME,
						contact: customer.FONE,
						bithday: customer.DATANASC,
						company: customer.NOMEFANTASIA,
					})
				}
			}

			this.logger.warn(`Total de clientes encontrados: ${result.length}`)
			this.resultMessage = `Total de clientes encontrados: ${result.length}`
		} else {
			this.logger.warn(`Nenhum cliente fazendo aniversário hoje`)
			this.resultMessage = `Nenhum cliente fazendo aniversário hoje`
		}

		if (!manualQuery) {
			await this.sendBirthdayMsg()
				.then(() => {
					this.logger.warn(`Envio de mensagens finalizado`)
				})
				.catch((err) => {
					this.logger.error(`Erro ao enviar mensagens: ${err}`)
					this.emitStatus({
						running: false,
						hasError: true,
						errorMessage: String(err),
					})
				})
			return
		}

		this.emitStatus({ running: false, lastSyncAt: new Date() })
	}

	async sendBirthdayMsg() {
		this.emitStatus({
			running: true,
			hasError: false,
			errorMessage: undefined,
			lastRunAt: new Date(),
		})

		const whatsappConfig = await this.anniversaryService.findAllConfigs()

		if (!whatsappConfig) {
			this.logger.error(`Configurações para envio de mensagens aos aniveráriantes não encontradas`)
			this.notificationsGateway.sendAlert(
				`Configurações para envio de mensagens aos aniveráriantes não encontradas`,
				'error',
			)
			this.emitStatus({
				running: false,
				hasError: true,
				errorMessage: 'Configurações não encontradas',
			})
			return
		}

		const whatsAppClientID = whatsappConfig.runInstance
		const runAuto = whatsappConfig.runAuto
		this.lastEnabled = runAuto

		try {
			if (whatsAppClientID === '') {
				this.logger.error('Envio não realizado, adicione uma conta de WhatsApp!')
				this.notificationsGateway.sendAlert(
					`Envio de mensagens aos aniversariantesnão realizado, adicione uma conta de WhatsApp`,
					'error',
				)
				this.emitStatus({
					running: false,
					hasError: true,
					errorMessage: 'Conta WhatsApp não configurada',
				})
				return
			}

			if (!runAuto) {
				this.logger.debug(`Envio automático não iniciado: runAuto: ${runAuto}`)
				this.emitStatus({ running: false, hasError: false })
				return
			}

			const messageModel = await this.messagesService.findOne(this.idMessage)

			if (!messageModel) {
				this.emitStatus({
					running: false,
					hasError: true,
					errorMessage: 'Modelo de mensagem não encontrado',
				})
				return
			}

			const birthdaysToday = await this.customerService.findBirthdayCustomers()

			const validBirthdaysToday = birthdaysToday.filter(
				(customer) => customer.active === true && customer.sendBithday === true,
			)

			if (validBirthdaysToday.length > 0) {
				for (const customer of validBirthdaysToday) {
					if (!customer.contact) {
						this.logger.warn(`Ciente ${customer.name} sem CONTATO`)
						await this.customerService.updateCustomer(customer.id, { active: false })
						continue
					}

					if (!customer.bithday) {
						this.logger.warn(`Ciente ${customer.name} sem data de nascimento`)
						continue
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

						const welcomeMessage = await this.anniversaryService.findWelcomeMessage()
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

					const mensagemFormated = formatMessage(messageModel.message, messageVars)

					const sent = await this.whatsappService.sendMessage({
						clientId: whatsAppClientID,
						number: contactFormated,
						message: mensagemFormated,
					})

					if (sent.success) {
						await this.customerService.updateCustomer(customer.id, {
							bithdaySentDate: formatTimeZone(new Date()),
						})

						await this.anniversaryService.createSentMessage({
							customerId: customer.id,
							isntance: whatsAppClientID,
							sentDate: formatTimeZone(new Date()),
							message: messageModel.message,
						})

						await this.appMetaService.increment('anniversary_sent_count')

						this.logger.log(
							`Mensagem enviada para: ${customer.name}`,
						)
					} else {
						if (sent?.error && sent.error.includes('is not on WhatsApp')) {
							this.logsService.createLog({
								customerId: customer.id,
								whatsappNumber: customer.contact,
								module: AnniversaryService.name,
								obs: 'O contato não tem WhatsApp, verifique o cadastro do cliente.',
							})

							this.customerService.disableCustomer(customer.id)
							this.logger.error(
								`O contato não tem WhatsApp, verifique o cadastro do cliente. Cliente ${customer.name} inativado!`,
							)

							continue
						}

						this.logger.error(sent.error)
					}

					await new Promise((resolve) => setTimeout(resolve, 40_000))
				}
			} else {
				this.logger.log(`Nenhum aniversariante para envio.`)
			}

			this.emitStatus({
				running: false,
				lastSyncAt: new Date(),
			})
		} catch (err) {
			this.logger.error(`Erro ao enviar mensagem automática: ${err}`)
			this.emitStatus({
				running: false,
				hasError: true,
				errorMessage: err.message,
			})
		}

		const totalSents = await this.appMetaService.get('anniversary_sent_count')
		this.emitStatus({
			sentCount: Number(totalSents) ?? 0,
			lastSyncAt: new Date(),
		})
	}
}
