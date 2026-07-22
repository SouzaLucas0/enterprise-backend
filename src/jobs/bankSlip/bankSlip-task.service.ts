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
import { normalizeTimeFormat } from '../../shared/utils/normalizeTimeFormat'
import { Customer } from 'src/features/customer/entities/customer.entity'
import { Pdf } from 'src/features/pdf/entities/pdf.entity'

@Injectable()
export class TaskBankSlipService {
	private readonly logger = new Logger(`Envio de boletos`)
	private readonly findBanckSlipe = findPdf
	private readonly cronSendBankSlip = 'cron-send-bankslip'
	private readonly bankSlipConfigId = 3
	private readonly jobKey = 'bankSlip'
	private readonly jobTitle = 'Boletos'
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
		const config = await this.pdfService.findConfigs(this.bankSlipConfigId)

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
		this.baseFolder = params.bolPath

		if (!this.baseFolder) {
			this.logger.error(`Informe a pasta padrão`)
			this.emitStatus({ running: false, hasError: true, errorMessage: 'Pasta padrão não informada' })
			return
		}

		this.logger.debug(`Pasta para consulta: ${this.baseFolder}`)
		this.emitStatus({ running: false, hasError: false })
	}

	createDynamicCron() {
		const job = setInterval(() => this.sendBackSlip(), this.scanIntervalMs)
		this.schedulerRegistry.addInterval(this.cronSendBankSlip, job)
	}

	updateSettings(interval: string, runAuto?: boolean) {
		const normalizedInterval = normalizeTimeFormat(interval)
		const parts = normalizedInterval.split(':').map(Number)
		const hours = parts.length === 2 ? parts[0] : 0
		const minutes = parts.length === 2 ? parts[1] : parts[0]
		const newIntervalMs = (hours * 60 + minutes) * 60 * 1000

		if (newIntervalMs !== this.scanIntervalMs) {
			this.scanIntervalMs = newIntervalMs
			this.logger.warn(`Intervalo de consulta alterado para: ${interval}`)
		}

		const intervals = this.schedulerRegistry.getIntervals()
		const exists = intervals.includes(this.cronSendBankSlip)

		if (runAuto === false) {
			if (exists) {
				this.schedulerRegistry.deleteInterval(this.cronSendBankSlip)
			}
			this.lastEnabled = false
			this.logger.debug(`Envio automático desativado`)
			this.emitStatus({ enabled: this.lastEnabled })
			return
		}

		if (runAuto === true) {
			if (exists) {
				this.schedulerRegistry.deleteInterval(this.cronSendBankSlip)
			}

			this.createDynamicCron()
			this.lastEnabled = true
			this.logger.debug(`Envio automático ativado`)
			this.emitStatus({ enabled: this.lastEnabled })
			return
		}

		if (exists) {
			this.schedulerRegistry.deleteInterval(this.cronSendBankSlip)
		}

		this.createDynamicCron()
		this.emitStatus({ enabled: this.lastEnabled })
	}

	async sendBackSlip() {
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
			this.baseFolder = params.bolPath

			if (!this.baseFolder) {
				this.logger.error(`Informe a pasta padrão`)
				this.notificationsGateway.sendAlert(`Pasta padrão para boletos não informada`, 'error')
				this.emitStatus({
					running: false,
					hasError: true,
					errorMessage: 'Pasta padrao nao informada',
				})
				return false
			}

			this.logger.warn(`Iniciando busca para envio`)

			const config = await this.pdfService.findConfigs(this.bankSlipConfigId)

			if (!config) {
				this.logger.error(`Configurações para envio de boletos não encontradas`)
				this.notificationsGateway.sendAlert(`Configurações para envio de boletos não encontradas`, 'error')
				this.emitStatus({
					running: false,
					hasError: true,
					errorMessage: 'Configurações para envio de boletos não encontradas',
				})
				return false
			}

			if (config.runInstance === '') {
				this.logger.error('Envio não realizado, adicione uma conta de WhatsApp')
				this.notificationsGateway.sendAlert(
					`Envio de boletos não realizado, adicione uma conta de WhatsApp`,
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
						PAR.CLIENTE,
						CLG.NOME,
						CLG.FONE,
						CLF.DATANASC,
						PAR.DOCUMENTO,
						PAR.PARCELA,
						PAR.NOSSONUMERO,
						PAR.VENCIMENTO,
						PAR.VALORPENDENTE
					FROM TRECPARCELA PAR
					LEFT OUTER JOIN TRECCLIENTEGERAL CLG ON (CLG.CODIGO = PAR.CLIENTE)
					LEFT OUTER JOIN TRECPFISICA CLF ON (CLF.CODIGO = CLG.CODIGO)
					LEFT OUTER JOIN TGEREMPRESA EMP ON (EMP.CODIGO = PAR.empresa)
					WHERE PAR.DATABOLETO = '${now}'
						AND PAR.NOSSONUMERO IS NOT NULL
						AND CLG.CODIGO NOT IN (88888, 99999, 99997, 99998)
			`)

			if (result.length > 0) {
				const sortedResult = result.sort((a, b) => parseInt(a.CLIENTE, 10) - parseInt(b.CLIENTE, 10))

				let count = 0

				for (let i = 0; i < sortedResult.length; i++) {
					let before = sortedResult[i - 1]
					let current = sortedResult[i]
					let customer = await this.customerService.findOneCustomer(current.CLIENTE)

					if (!customer) {
						customer = await this.customerService.createCustomer({
							id: current.CLIENTE,
							name: current.NOME,
							contact: current.FONE,
							bithday: current.DATANASC,
							lastPurchaseDate: new Date('1900-01-01T04:00:00.000Z'),
							lastPurchaseValue: 0,
							company: current.NOMEFANTASIA,
						})
					} else {
						await this.customerService.updateCustomer(current.CLIENTE, {
							name: current.NOME,
							contact: current.FONE,
							bithday: current.DATANASC,
						})
					}

					if (!customer.active || !customer.sendBankSlip) continue

					if (!current.FONE) {
						this.logger.warn(`Ciente ${current.NOME} sem CONTATO`)
						await this.customerService.updateCustomer(customer.id, { active: false })
						continue
					}

					let pdf = await this.pdfService.findOnePdf(`${current.DOCUMENTO}/${current.PARCELA}`)

					if (pdf && pdf.sentBankSlip !== false) continue

					if (!pdf) {
						pdf = await this.pdfService.createPdf({
							id: `${current.DOCUMENTO}/${current.PARCELA}`,
							ourNumber: current.NOSSONUMERO,
							sentBankSlip: false,
							customerId: current.CLIENTE,
						})
					}

					if (!pdf) {
						this.logger.error(`Error: PDF do boleto: ${current.NOSSONUMERO} não cadastrado`)
						continue
					}

					const messageVars = {
						numeroPedido: current.DOCUMENTO,
						nomeEmpresa: current.NOMEFANTASIA,
						nomeCliente: pdf.customer.name,
						nossoNumero: pdf.ourNumber,
						valorPendente: Number(current.VALORPENDENTE).toFixed(2),
						vencimento: formatDate(current.VENCIMENTO.toString()),
					}

					const message = await this.pdfService.findBankSlipMessage()

					if (!message) {
						this.logger.error(`Mensagem não encontrada`)
						this.emitStatus({
							running: false,
							hasError: true,
							errorMessage: 'Mensagem não encontrada',
						})
						return false
					}

					const contactFormated = `55${formatContact(pdf.customer.contact)}`

					if (customer.firstMessageSent === false) {
						const welcomeMessageVars = {
							nomeEmpresa: current.NOMEFANTASIA,
							nomeCliente: pdf.customer.name,
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
					const foundPath = this.findBanckSlipe(this.baseFolder, current.NOSSONUMERO)

					if (foundPath) {
						if (!before || current.CLIENTE !== before.CLIENTE) {
							this.sendMessage(
								config.runInstance,
								contactFormated,
								mensagemFormated,
								foundPath,
								current,
								customer,
								pdf,
								count,
							)
						} else {
							this.sendMedia(
								config.runInstance,
								contactFormated,
								foundPath,
								current,
								customer,
								pdf,
								count,
							)
						}
					} else {
						this.logger.error(`Boleto NossoNúmero: ${current.NOSSONUMERO} não encontrado`)
					}

					await new Promise((resolve) => setTimeout(resolve, 40_000))
				}

				if (count > 0) {
					this.logger.warn(`${count} boletos enviados`)
				} else {
					this.logger.warn(`Nenhum boleto enviado`)
				}
			} else {
				this.logger.warn(`Nenhum boleto para envio encontrado`)
			}

			this.emitStatus({
				running: false,
				lastSyncAt: new Date(),
			})
		} catch (err) {
			this.logger.error(`Erro ao enviar boletos: ${err}`)
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

	async sendMessage(
		clientId: string,
		number: string,
		message: string,
		filePath: string,
		current: any,
		customer: Customer,
		pdf: Pdf,
		count: number,
	) {
		this.logger.log(`Processando envio de mensagem para: ${customer.name}`)

		await this.whatsappService.sendMessage({
			clientId: clientId,
			number: number,
			message: message,
		})

		await new Promise((resolve) => setTimeout(resolve, 10_000))

		await this.sendMedia(clientId, number, filePath, current, customer, pdf, count)
	}

	async sendMedia(
		clientId: string,
		number: string,
		filePath: string,
		current: any,
		customer: Customer,
		pdf: Pdf,
		count: number,
	) {
		this.logger.log(`Processando envio de PDF para: ${customer.name}`)

		const sentMedia = await this.whatsappService.sendMedia({
			clientId: clientId,
			number: number,
			filePath: filePath,
			type: 'document',
			docName: `Boleto-${current.NOSSONUMERO}`,
		})

		if (sentMedia.success) {
			await this.pdfService.updatePdf(pdf.id, { sentBankSlip: true })
			await this.appMetaService.increment('bankslip_sent_count')

			this.logger.log(`PDF do boleto enviado para ${customer.name}`)
			count = count + 1
		} else {
			this.logger.error(sentMedia.error)

			if (sentMedia?.error && sentMedia.error.includes('is not on WhatsApp')) {
				this.logsService.createLog({
					customerId: customer.id,
					whatsappNumber: customer.contact,
					module: TaskBankSlipService.name,
					obs: 'O contato não tem WhatsApp, verifique o cadastro do cliente.',
				})

				this.customerService.disableCustomer(customer.id)
				this.logger.error(
					`O contato não tem WhatsApp, verifique o cadastro do cliente. Cliente ${customer.name} inativado!`,
				)
			}
		}
	}
}
