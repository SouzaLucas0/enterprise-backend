import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import { WorkOrderSituationService } from 'src/features/work-order/work-order-situation.service'
import { WorkOrderService } from 'src/features/work-order/work-order.service'
import { JobStatusType } from '../../@types/jobStatusType'
import { AppMetaService } from '../../core/app-meta/app-meta.service'
import { CustomerService } from '../../features/customer/customer.service'
import { LogsService } from '../../features/logs/logs.service'
import { FirebirdService } from '../../integrations/firebird/firebird.service'
import { NotificationsGateway } from '../../integrations/notifications/notifications.gateway'
import { WhatsappService } from '../../integrations/whatsapp/whatsapp.service'
import { formatContact } from '../../shared/utils/formatContact'
import { formatDate } from '../../shared/utils/formatDate'
import { formatMessage } from '../../shared/utils/formatMessage'
import { normalizeTimeFormat } from '../../shared/utils/normalizeTimeFormat'

@Injectable()
export class TaskWorkOrderService {
	private readonly logger = new Logger(`Envio de O.S.`)
	private readonly cronSendWorkOrder = 'cron-send-os'
	private readonly jobKey = 'os'
	private readonly jobTitle = 'Ordem de Serviço'
	private lastEnabled = false
	private scanIntervalMs = 10 * 60 * 1000
	private isSending = false

	constructor(
		private readonly fb: FirebirdService,
		private readonly schedulerRegistry: SchedulerRegistry,
		private readonly whatsappService: WhatsappService,
		private readonly customerService: CustomerService,
		@Inject(forwardRef(() => WorkOrderService))
		private readonly workOrderService: WorkOrderService,
		private readonly logsService: LogsService,
		private readonly notificationsGateway: NotificationsGateway,
		private readonly appMetaService: AppMetaService,
		private readonly workOrderSituationService: WorkOrderSituationService,
	) {}

	private emitStatus(patch: Partial<JobStatusType>) {
		this.notificationsGateway.updateJobStatus(this.jobKey, {
			title: this.jobTitle,
			enabled: this.lastEnabled,
			...patch,
		})
	}

	async onModuleInit() {
		const config = await this.workOrderService.findAllConfigs()

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

		this.emitStatus({ running: false, hasError: false })
	}

	createDynamicCron() {
		const job = setInterval(() => this.sendWorkOrder(), this.scanIntervalMs)
		this.schedulerRegistry.addInterval(this.cronSendWorkOrder, job)
	}

	private buildDateTime(dateValue: unknown, timeValue: unknown): Date | null {
		if (!dateValue || !timeValue) {
			return null
		}

		const dateObj = dateValue instanceof Date ? dateValue : new Date(String(dateValue))
		const timeObj = timeValue instanceof Date ? timeValue : new Date(String(timeValue))

		if (Number.isNaN(dateObj.getTime()) || Number.isNaN(timeObj.getTime())) {
			return null
		}

		const datePart = dateObj.toISOString().split('T')[0]
		const timePart = timeObj.toISOString().split('T')[1]
		const fullDate = new Date(`${datePart}T${timePart}`)

		return Number.isNaN(fullDate.getTime()) ? null : fullDate
	}

	private formatDateTime(dateValue: Date | null | undefined): string {
		if (!dateValue) {
			return ''
		}

		const formattedDate = formatDate(dateValue)
		const hours = String(dateValue.getHours()).padStart(2, '0')
		const minutes = String(dateValue.getMinutes()).padStart(2, '0')

		return `${hours}:${minutes} do dia ${formattedDate}`
	}

	private normalizeSituationDescription(description: unknown, situationId?: unknown): string {
		const normalizedId = situationId === null || situationId === undefined ? '' : String(situationId).trim()
		const byId: Record<string, string> = {
			'1': 'LIVRE',
			'2': 'ABERTA',
			'3': 'EM EXECUCAO',
			'4': 'CONCLUIDA',
			'5': 'FECHADA',
		}

		if (byId[normalizedId]) {
			return byId[normalizedId]
		}

		if (description === null || description === undefined) {
			return ''
		}

		const normalizedText = String(description)
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/�/g, '')
			.replace(/\s+/g, ' ')
			.trim()
			.toUpperCase()

		if (normalizedText.includes('EXECU')) {
			return 'EM EXECUCAO'
		}

		if (normalizedText.includes('CONCLU')) {
			return 'CONCLUIDA'
		}

		if (normalizedText.includes('ABERT')) {
			return 'ABERTA'
		}

		if (normalizedText.includes('FECH')) {
			return 'FECHADA'
		}

		if (normalizedText.includes('LIVR')) {
			return 'LIVRE'
		}

		return normalizedText
	}

	updateSettings(interval: string, runAuto?: boolean) {
		const normalizedInterval = normalizeTimeFormat(interval)

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
			this.logger.warn(`Intervalo de consulta alterado para: ${normalizedInterval}`)
		}

		this.scanIntervalMs = newIntervalMs

		const intervals = this.schedulerRegistry.getIntervals()
		const exists = intervals.includes(this.cronSendWorkOrder)

		if (runAuto === false) {
			if (exists) {
				this.schedulerRegistry.deleteInterval(this.cronSendWorkOrder)
			}
			this.lastEnabled = false
			this.logger.debug(`Envio automático desativado`)
			this.emitStatus({ enabled: this.lastEnabled })
			return
		}

		if (runAuto === true) {
			if (exists) {
				this.schedulerRegistry.deleteInterval(this.cronSendWorkOrder)
			}

			this.createDynamicCron()
			this.lastEnabled = true
			this.logger.debug(`Envio automático ativado`)
			this.emitStatus({ enabled: this.lastEnabled })
			return
		}

		if (exists) {
			this.schedulerRegistry.deleteInterval(this.cronSendWorkOrder)
		}

		this.createDynamicCron()
		this.emitStatus({ enabled: this.lastEnabled })
	}

	async sendWorkOrder() {
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
			this.logger.warn(`Iniciando busca para envio`)

			const config = await this.workOrderService.findAllConfigs()

			if (!config) {
				this.logger.error(`Configurações para envio de ordens de serviço não encontradas`)
				this.notificationsGateway.sendAlert(
					`Configurações para envio de ordens de serviço não encontradas`,
					'error',
				)
				this.emitStatus({
					running: false,
					hasError: true,
					errorMessage: 'Configurações para envio de O.S. não encontradas',
				})
				return false
			}

			if (config.runInstance === '') {
				this.logger.error('Envio não realizado, adicione uma conta de WhatsApp')
				this.emitStatus({
					running: false,
					hasError: true,
					errorMessage: 'Conta WhatsApp não configurada',
				})
				return false
			}

			const result = await this.fb.query(`
				SELECT
					CLG.NOME,
					CLG.FONE,
					CLF.DATANASC,
					PED.CLIENTE,
					EMP.NOMEFANTASIA,
					PED.EMPRESA AS "EMPRESA",
					PED.DATA AS "DATA",
					PED.HORA AS "HORA",            
					PED.CODIGO AS "PEDIDO",                
					PED.IDSITUACAO AS "IDSITUACAO",
					PED.IDPRISMA AS "PRISMA",
					PED.IDOBJETO AS "OBJETO",
					PED.KM AS "KM",
					PED.DEFEITO AS "DEFEITO",
					PED.PERTENCES AS "PERTENCES",
					PED.DESCRICAOOBJETO,
					PED.HORAPREVISAOENTREGA,
					PED.DATAPREVISAOENTREGA,
					MAR.DESCRICAOMARCA AS "MARCA",
					MOD.DESCRICAOMODELO AS "MODELO",
					OBJ.VEI_PLACA AS "PLACA",
					COALESCE(Sit.Descricao, IIF(Ped.Status = 'BLQ','BLOQUEADA  ', IIF(Ped.Status = 'CRE','CREDIARIO  ', IIF(Ped.Status = 'EFE','REGISTRADA ','OUTROS')))) AS "SITUACAO",
					PED.STATUS AS "STATUS",
					MEC.NOME   AS "MECANICO"
				FROM TVENPEDIDO PED
					LEFT OUTER JOIN TORDOBJETO OBJ ON (OBJ.CODIGO = PED.IDOBJETO)
					LEFT OUTER JOIN TRECCLIENTEGERAL CLG ON (CLG.CODIGO = PED.CLIENTE)
					LEFT OUTER JOIN TRECPFISICA CLF ON (CLF.CODIGO = CLG.CODIGO)
					LEFT OUTER JOIN TGEREMPRESA EMP ON (EMP.CODIGO = PED.EMPRESA)
					LEFT OUTER JOIN TORDMARCA MAR ON (MAR.CODIGOMARCA = OBJ.IDMARCA)
					LEFT OUTER JOIN TORDMODELO MOD ON (MOD.CODIGOMARCA = OBJ.IDMARCA AND MOD.CODIGOMODELO = OBJ.IDMODELO)
					LEFT OUTER JOIN TVENVENDEDOR VDD ON (VDD.EMPRESA = PED.EMPRESA AND VDD.CODIGO = PED.VENDEDOR)
					LEFT OUTER JOIN TVENVENDEDOR MEC ON (MEC.EMPRESA = PED.EMPRESA AND MEC.CODIGO = PED.MECANICO)
					LEFT OUTER JOIN TORDSITUACAO SIT ON (SIT.EMPRESA = PED.EMPRESA AND SIT.IDSITUACAO = PED.IDSITUACAO)
					LEFT OUTER JOIN TRECCLIENTEGERAL CLI ON (CLI.CODIGO = PED.CLIENTE)
				WHERE PED.TIPOPEDIDO = 'M'
					AND PED.STATUS IN ('PEN','CXA')
					AND PED.CLIENTE NOT IN (88888, 99999, 99997, 99998)
			`)

			if (result.length > 0) {
				let count = 0
				for (const os of result) {
					const orderDateTime = this.buildDateTime(os.DATA, os.HORA)
					const forecastDateTime = this.buildDateTime(os.DATAPREVISAOENTREGA, os.HORAPREVISAOENTREGA)
					const normalizedSituation = this.normalizeSituationDescription(os.SITUACAO, os.IDSITUACAO)

					if (!orderDateTime) {
						this.logger.warn(`O.S. ${os.PEDIDO} ignorada por data/hora inválida.`)
						continue
					}

					let customer = await this.customerService.findOneCustomer(os.CLIENTE)

					if (!customer) {
						customer = await this.customerService.createCustomer({
							id: os.CLIENTE,
							name: os.NOME,
							contact: os.FONE,
							bithday: os.DATANASC,
							lastPurchaseDate: new Date('1900-01-01T04:00:00.000Z'),
							lastPurchaseValue: 0,
							company: os.NOMEFANTASIA,
						})
					} else {
						await this.customerService.updateCustomer(os.CLIENTE, {
							name: os.NOME,
							contact: os.FONE,
							bithday: os.DATANASC,
						})
					}

					if (!customer.active || !customer.sendOS) continue

					if (!os.FONE) {
						this.logger.warn(`Ciente ${os.NOME} sem CONTATO`)
						await this.customerService.updateCustomer(customer.id, { active: false })
						continue
					}

					let workOrder = await this.workOrderService.findOneWorkOrder(`${os.PEDIDO}`)

					if (workOrder) {
						const updatePayload: any = {
							situation: normalizedSituation,
							prisma: os.PRISMA,
							customerId: customer.id,
							km: os.KM,
							brand: os.MARCA,
							model: os.MODELO,
							vehiclePlate: os.PLACA,
							belongings: os.PERTENCES,
							defect: os.DEFEITO,
							mechanic: os.MECANICO,
						}

						if (forecastDateTime) {
							updatePayload.forecast = forecastDateTime
						}

						workOrder = await this.workOrderService.updateWorkOrder(workOrder.id, updatePayload)
					}

					if (!workOrder) {
						workOrder = await this.workOrderService.createWorkOrder({
							id: os.PEDIDO,
							situation: normalizedSituation,
							date: orderDateTime,
							prisma: os.PRISMA,
							brand: os.MARCA ?? '',
							model: os.MODELO ?? '',
							vehiclePlate: os.PLACA ?? '',
							km: os.KM ?? 0,
							defect: os.DEFEITO ?? '',
							belongings: os.PERTENCES ?? '',
							forecast: forecastDateTime ?? orderDateTime,
							mechanic: os.MECANICO ?? 'Sem Mecânico Informado',
							active: true,
							customerId: customer.id,
						})
					}

					if (!workOrder) {
						this.logger.error(`Error: O.S.: ${os.PEDIDO} não cadastrada`)
						continue
					}

					if (workOrder.lastSituationSent === workOrder.situation) {
						this.logger.debug(`Situação da O.S. ${workOrder.id} não alterada, mensagem não enviada.`)
						continue
					}

					const messageVars = {
						numeroOS: workOrder.id,
						nomeEmpresa: os.NOMEFANTASIA,
						nomeCliente: workOrder.customer.name,
						dataOS: formatDate(workOrder.date),
						descricaoObjeto: os.DESCRICAOOBJETO,
						marca: workOrder.brand,
						modelo: workOrder.model,
						placa: workOrder.vehiclePlate,
						km: workOrder.km,
						defeitos: workOrder.defect,
						pertences: workOrder.belongings,
						previsaoEntrega: this.formatDateTime(workOrder.forecast),
						mecanico: workOrder.mechanic,
						prisma: workOrder.prisma,
					}

					const message = await this.workOrderSituationService.getMessageBySituation(workOrder.situation)

					if (!message) continue

					const contactFormated = `55${formatContact(workOrder.customer.contact)}`

					if (customer.firstMessageSent === false) {
						const welcomeMessageVars = {
							nomeEmpresa: os.NOMEFANTASIA,
							nomeCliente: workOrder.customer.name,
						}

						const welcomeMessage = await this.workOrderService.findWelcomeMessage()
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

					const sent = await this.whatsappService.sendMessage({
						clientId: config.runInstance,
						number: contactFormated,
						message: mensagemFormated,
					})

					if (sent.success) {
						await this.workOrderService.updateWorkOrder(workOrder.id, {
							lastSituationSent: workOrder.situation,
						})

						if (os.STATUS !== 'PEN') {
							await this.workOrderService.updateWorkOrder(workOrder.id, { active: false })
						}

						await this.appMetaService.increment('os_sent_count')
						this.logger.log(`O.S. enviada para ${customer.name}`)
						count = count + 1
					} else {
						this.logger.error(sent.error)

						if (sent?.error && sent.error.includes('is not on WhatsApp')) {
							this.logsService.createLog({
								customerId: customer.id,
								whatsappNumber: customer.contact,
								module: TaskWorkOrderService.name,
								obs: 'O contato não tem WhatsApp, verifique o cadastro do cliente.',
							})

							this.customerService.disableCustomer(customer.id)
							this.logger.error(
								`O contato não tem WhatsApp, verifique o cadastro do cliente. Cliente ${customer.name} inativado!`,
							)
						}
					}

					await new Promise((resolve) => setTimeout(resolve, 40_000))
				}

				if (count > 0) {
					this.logger.warn(`${count} O.S. enviadas`)
				} else {
					this.logger.warn(`Nenhuma O.S. enviada`)
				}
			} else {
				this.logger.warn(`Nenhuma O.S. para envio encontrada`)
			}

			this.emitStatus({
				running: false,
				lastSyncAt: new Date(),
			})
		} catch (err) {
			this.logger.error(`Erro ao enviar O.S.: ${err}`)
			this.notificationsGateway.sendAlert(`Erro ao enviar O.S.: ${err.message}`, 'error')
			this.emitStatus({
				running: false,
				hasError: true,
				errorMessage: err.message,
			})
		} finally {
			const totalSents = await this.appMetaService.get('os_sent_count')

			this.emitStatus({
				sentCount: Number(totalSents) ?? 0,
				lastSyncAt: new Date(),
			})

			this.isSending = false
		}
	}

	async getSituations() {
		const result = await this.fb.query(`
			SELECT
				SIT.IDSITUACAO,
				SIT.DESCRICAO,
				SIT.ATIVO
			FROM TOrdSituacao SIT
		`)

		if (result.length > 0) {
			for (const situation of result) {
				const description = this.normalizeSituationDescription(situation.DESCRICAO, situation.IDSITUACAO)
				const existing = await this.workOrderSituationService.findOne(situation.IDSITUACAO)
				if (!existing) {
					await this.workOrderSituationService.create({
						id: situation.IDSITUACAO,
						description: description,
						active: false,
					})
					this.logger.log(`Situação ${description} criada com sucesso.`)
				} else {
					await this.workOrderSituationService.update(situation.IDSITUACAO, {
						description: description,
					})
				}
			}
		}
	}
}
