import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import { JobStatusType } from '../../@types/jobStatusType'
import { AppMetaService } from '../../core/app-meta/app-meta.service'
import { CustomerService } from '../../features/customer/customer.service'
import { LogsService } from '../../features/logs/logs.service'
import { ParamsService } from '../../features/params/params.service'
import { PdfService } from '../../features/pdf/pdf.service'
import { FirebirdService } from '../../integrations/firebird/firebird.service'
import { NotificationsGateway } from '../../integrations/notifications/notifications.gateway'
import { WhatsappService } from '../../integrations/whatsapp/whatsapp.service'
import { findPdf } from '../../shared/utils/findPdf'
import { formatContact } from '../../shared/utils/formatContact'
import { formatDate } from '../../shared/utils/formatDate'
import { formatMessage } from '../../shared/utils/formatMessage'

@Injectable()
export class TaskNfeService {
	private readonly logger = new Logger(`Envio de NFe`)
	private readonly findNfe = findPdf
	private readonly cronSendNfe = 'cron-send-nfe'
	private readonly NfeConfigId = 4
	private readonly jobKey = 'nfe'
	private readonly jobTitle = 'NFe'
	private lastEnabled = false
	private scanIntervalMs = 10 * 60 * 1000
	private isSending = false
	private baseFolder = null

	constructor(
		private readonly fb: FirebirdService,
		private readonly schedulerRegistry: SchedulerRegistry,
		private readonly whatsappService: WhatsappService,
		private readonly customerService: CustomerService,
		@Inject(forwardRef(() => PdfService))
		private readonly pdfService: PdfService,
		private readonly paramsService: ParamsService,
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
		const config = await this.pdfService.findConfigs(this.NfeConfigId)

		if (config) {
			this.lastEnabled = config.runAuto
			if (!config.runAuto) {
				this.logger.debug(`Envio automático desativado`)
				this.emitStatus({ running: false, hasError: false, enabled: false })
				return
			}

			this.updateSettings(config.runTime, true)
		} else {
			this.lastEnabled = true
			this.createDynamicCron()
		}

		const params = await this.paramsService.loadConfig()
		this.baseFolder = params.nfPath

		if (!this.baseFolder) {
			this.logger.error(`Informe a pasta padrão`)
			this.emitStatus({ running: false, hasError: true, errorMessage: 'Pasta padrão não informada' })
			return
		}

		this.logger.debug(`Pasta para consulta: ${this.baseFolder}`)
		this.emitStatus({ running: false, hasError: false })
	}

	private normalizeTimeFormat(time: string): string {
		const parts = time.split(':')
		if (parts.length === 3) {
			return `${parts[0]}:${parts[1]}`
		}
		return time
	}

	createDynamicCron() {
		const job = setInterval(() => this.sendNfe(), this.scanIntervalMs)
		this.schedulerRegistry.addInterval(this.cronSendNfe, job)
	}

	updateSettings(interval: string, runAuto?: boolean) {
		const normalizedInterval = this.normalizeTimeFormat(interval)

		const parts = normalizedInterval.split(':').map(Number)

		let hours = 0
		let minutes = 0

		if (parts.length === 1) {
			minutes = parts[0]
		} else if (parts.length === 2) {
			hours = parts[0]
			minutes = parts[1]
		}

		const newIntervalMs = (hours * 60 + minutes) * 60 * 1000

		if (newIntervalMs !== this.scanIntervalMs) {
			this.scanIntervalMs = newIntervalMs
			this.logger.warn(`Intervalo de consulta alterado para: ${normalizedInterval} (${newIntervalMs / 1000}s)`)
		}

		const intervals = this.schedulerRegistry.getIntervals()
		const exists = intervals.includes(this.cronSendNfe)

		if (runAuto === false) {
			if (exists) {
				this.schedulerRegistry.deleteInterval(this.cronSendNfe)
			}
			this.lastEnabled = false
			this.logger.debug(`Envio automático desativado`)
			this.emitStatus({ enabled: this.lastEnabled })
			return
		}

		if (runAuto === true) {
			if (exists) {
				this.schedulerRegistry.deleteInterval(this.cronSendNfe)
			}

			this.createDynamicCron()
			this.lastEnabled = true
			this.logger.debug(`Envio automático ativado`)
			this.emitStatus({ enabled: this.lastEnabled })
			return
		}

		if (exists) {
			this.schedulerRegistry.deleteInterval(this.cronSendNfe)
		}

		this.createDynamicCron()
		this.emitStatus({ enabled: this.lastEnabled })
	}

	async sendNfe() {
		if (this.isSending) {
			this.logger.warn('Execucao anterior ainda em andamento. Novo ciclo ignorado para evitar envio duplicado.')
			return false
		}

		this.isSending = true

		this.emitStatus({
			running: true,
			hasError: false,
			errorMessage: undefined,
			lastRunAt: new Date(),
		})

		try {
			const params = await this.paramsService.loadConfig()
			this.baseFolder = params.nfPath

			if (!this.baseFolder) {
				this.logger.error(`Informe a pasta padrão`)
				this.notificationsGateway.sendAlert(`Pasta padrão não informada`, 'error')
				this.emitStatus({
					running: false,
					hasError: true,
					errorMessage: 'Pasta padrão não informada',
				})
				return false
			}

			this.logger.warn(`Iniciando busca para envio`)

			const config = await this.pdfService.findConfigs(this.NfeConfigId)

			if (!config) {
				this.logger.error(`Configurações para envio de NFe não encontradas`)
				this.notificationsGateway.sendAlert(`Configurações para envio de NFe não encontradas`, 'error')
				this.emitStatus({
					running: false,
					hasError: true,
					errorMessage: 'Configurações para envio de NFe não encontradas',
				})
				return false
			}

			if (config.runInstance === '') {
				this.logger.error('Envio não realizado, adicione uma conta de WhatsApp')
				this.notificationsGateway.sendAlert(
					`Envio de NFe não realizado, adicione uma conta de WhatsApp`,
					'error',
				)
				this.emitStatus({
					running: false,
					hasError: true,
					errorMessage: 'Conta WhatsApp não configurada',
				})
				return false
			}

			const now = new Date()
				.toLocaleDateString('pt-BR', { timeZone: 'America/Manaus' })
				.split('/')
				.reverse()
				.join('-')

			const result = await this.fb.query(`
				SELECT
					EMP.NOMEFANTASIA, 
					PED.CODIGO,
					PED.CLIENTE,
					CLG.NOME,
					CLG.FONE,
					CLF.DATANASC,
					PED.NOTANFE,
					PED.NUMERODUNFE,
					PED.DATA
				FROM TVENPEDIDO PED
				LEFT OUTER JOIN TRECCLIENTEGERAL CLG ON (CLG.CODIGO = PED.CLIENTE)
				LEFT OUTER JOIN TRECPFISICA CLF ON (CLF.codigo = CLG.CODIGO)
            LEFT OUTER JOIN tgerempresa EMP ON (EMP.codigo = PED.empresa)

				WHERE PED.NUMERODUNFE IS NOT NULL
				AND PED.NOTANFE IS NOT NULL
				AND PED.DATA = '${now}'
				AND CLG.CODIGO NOT IN (88888, 99999, 99997, 99998)
				`)

			if (result.length > 0) {
				let count = 0
				for (const pdfs of result) {
					let customer = await this.customerService.findOneCustomer(pdfs.CLIENTE)

					if (!customer) {
						customer = await this.customerService.createCustomer({
							id: pdfs.CLIENTE,
							name: pdfs.NOME,
							contact: pdfs.FONE,
							bithday: pdfs.DATANASC,
							lastPurchaseDate: new Date('1900-01-01T04:00:00.000Z'),
							lastPurchaseValue: 0,
							company: pdfs.NOMEFANTASIA,
						})
					} else {
						await this.customerService.updateCustomer(pdfs.CLIENTE, {
							name: pdfs.NOME,
							contact: pdfs.FONE,
							bithday: pdfs.DATANASC,
						})
					}

					if (!customer.active || !customer.sendNfe) continue

					if (!pdfs.FONE) {
						this.logger.warn(`Ciente ${pdfs.NOME} sem CONTATO`)
						await this.customerService.updateCustomer(customer.id, { active: false })
						continue
					}

					let pdf = await this.pdfService.findOnePdf(`${pdfs.CODIGO}`)

					if (pdf && pdf.sentNfe !== false) continue

					if (!pdf) {
						pdf = await this.pdfService.createPdf({
							id: `${pdfs.CODIGO}`,
							nfeNumber: pdfs.NUMERODUNFE,
							sentNfe: false,
							customerId: pdfs.CLIENTE,
						})
					}

					if (!pdf) {
						this.logger.error(`Error: PDF da NFe: ${pdfs.NOTANFE} não cadastrado`)
						continue
					}

					const messageVars = {
						nomeEmpresa: pdfs.NOMEFANTASIA,
						nomeCliente: pdf.customer.name,
						numeroNfe: pdfs.NOTANFE,
						codigoPedido: pdfs.CODIGO,
						dataPedido: formatDate(pdfs.DATA.toString()),
					}

					const message = await this.pdfService.findNfeMessage()

					if (!message) {
						this.logger.error(`Menssagem não encontrada`)
						this.emitStatus({
							running: false,
							hasError: true,
							errorMessage: 'Mensagem nao encontrada',
						})
						return false
					}

					const contactFormated = `55${formatContact(pdf.customer.contact)}`

					if (customer.firstMessageSent === false) {
						const welcomeMessageVars = {
							nomeEmpresa: pdfs.NOMEFANTASIA,
							nomeCliente: pdf.customer.name
						}

						const welcomeMessage = await this.pdfService.findWelcomeMessage()
						const mensagemFormated = formatMessage(welcomeMessage!.message, welcomeMessageVars)

						const sent = await this.whatsappService.sendMessage({
							clientId: config.runInstance,
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

					const mensagemFormated = formatMessage(message.message, messageVars)
					const foundPath = this.findNfe(this.baseFolder, pdfs.NUMERODUNFE)

					if (foundPath) {
						const sent = await this.whatsappService.sendMedia({
							clientId: config.runInstance,
							number: contactFormated,
							type: 'document',
							filePath: foundPath,
							docName: `NFe-${pdfs.NOTANFE}`,
							caption: mensagemFormated,
						})

						if (sent.success) {
							await this.pdfService.updatePdf(pdf.id, { sentNfe: true })
							await this.appMetaService.increment('nfe_sent_count')
							this.logger.log(`NFe enviada para ${customer.name}`)
							count = count + 1
						} else {
							this.logger.error(sent.error)

							if (sent?.error && sent.error.includes('is not on WhatsApp')) {
								this.logsService.createLog({
									customerId: customer.id,
									whatsappNumber: customer.contact,
									module: TaskNfeService.name,
									obs: 'O contato não tem WhatsApp, verifique o cadastro do cliente.',
								})

								this.customerService.disableCustomer(customer.id)
								this.logger.error(
									`O contato não tem WhatsApp, verifique o cadastro do cliente. Cliente ${customer.name} inativado!`,
								)
							}
						}
					} else {
						this.logger.error(`NFe: ${pdfs.NUMERODUNFE} não encontrado`)
					}

					await new Promise((resolve) => setTimeout(resolve, 40_000))
				}

				if (count > 0) {
					this.logger.warn(`${count} NFe enviadas`)
				} else {
					this.logger.warn(`Nenhuma NFe enviada`)
				}
			} else {
				this.logger.warn(`Nenhuma NFe para envio encontrada`)
			}

			this.emitStatus({
				running: false,
				lastSyncAt: new Date(),
			})
		} catch (err) {
			this.logger.error(`Erro ao enviar NFe: ${err}`)
			this.notificationsGateway.sendAlert(`Erro ao enviar NFe: ${err.message}`, 'error')
			this.emitStatus({
				running: false,
				hasError: true,
				errorMessage: err.message,
			})
		} finally {
			const totalSents = await this.appMetaService.get('nfe_sent_count')
			this.emitStatus({
				sentCount: Number(totalSents) ?? 0,
				lastSyncAt: new Date(),
			})

			this.isSending = false
		}
	}
}
