import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import { CronJob } from 'cron'
import { JobStatusType } from '../../@types/jobStatusType'
import { AppMetaService } from '../../core/app-meta/app-meta.service'
import { ChargeService } from '../../features/charge/charge.service'
import { ChargeRole } from '../../features/charge/entities/chargeRole.entity'
import { CustomerService } from '../../features/customer/customer.service'
import { LogsService } from '../../features/logs/logs.service'
import { FirebirdService } from '../../integrations/firebird/firebird.service'
import { NotificationsGateway } from '../../integrations/notifications/notifications.gateway'
import { WhatsappService } from '../../integrations/whatsapp/whatsapp.service'
import { calculateInterest, calculatePenalty } from '../../shared/utils/calculateInterestAndPenalty'
import { formatContact } from '../../shared/utils/formatContact'
import { formatDate } from '../../shared/utils/formatDate'
import { formatMessage } from '../../shared/utils/formatMessage'
import { formatTimeZone } from '../../shared/utils/formatTimeZone'

@Injectable()
export class TasksChargeService {
	private readonly logger = new Logger(`Envio de cobranças`)
	private readonly cronGetClients = 'cron-get-clients'
	private readonly jobKey = 'charge'
	private readonly jobTitle = 'Cobranças'
	private lastEnabled = false
	private resultMessage: string
	private count: number
	private isSending = false

	constructor(
		private readonly fb: FirebirdService,
		@Inject(forwardRef(() => ChargeService))
		private readonly chargeService: ChargeService,
		private readonly schedulerRegistry: SchedulerRegistry,
		private readonly whatsappService: WhatsappService,
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
		let runConfig = await this.chargeService.findAllConfigs()

		if (!runConfig) {
			this.logger.error(`Configurações para envio de cobranças não encontradas`)
			this.logger.warn(`Criando configurações padrões`)

			const defaultConfig = await this.chargeService.updateConfig({
				runAuto: false,
				runTime: '10:00',
				runFirebird: '09:31',
			})

			runConfig = defaultConfig
		}

		this.lastEnabled = runConfig.runAuto
		this.emitStatus({
			running: false,
			hasError: false,
		})
		this.updateCronGetClients(runConfig.runTime, runConfig.runAuto)
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
		return `${minute} ${hour} * * 1-6`
	}

	updateCronGetClients(time: string, runAuto: boolean) {
		const normalizedTime = this.normalizeTimeFormat(time)
		const cron = this.convertTimeToCron(time)

		try {
			this.schedulerRegistry.deleteCronJob(this.cronGetClients)
		} catch (err) {}

		const job = new CronJob(cron, () => this.queryChager(true), null, false, 'America/Manaus')
		this.schedulerRegistry.addCronJob(this.cronGetClients, job)
		job.start()

		this.logger.debug(`Envio de mensagem agendado para ${normalizedTime}`)
		this.logger.debug(`Envio automamatico: ${runAuto ? `Ativado` : `Desativado`}`)

		this.lastEnabled = runAuto ?? this.lastEnabled
		this.emitStatus({ enabled: this.lastEnabled })
	}

	async manualChargeQuery() {
		await this.queryChager(false)
		return { message: this.resultMessage }
	}

	async queryChager(sendChargeMsg: boolean) {
		const now = new Date().toISOString().split('T')[0]
		const roleConfig = await this.chargeService.findAllChargeRoles()
		const daysList = roleConfig
			.map((role) => Number(role.qtdDaysLate))
			.filter((value) => Number.isFinite(value) && value > 0)
		const maxQtdDaysLate = daysList.length > 0 ? Math.max(...daysList) : 30
		const DaysAgo = new Date(Date.now() - maxQtdDaysLate * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
		this.logger.warn(`Consultando cobranças vencidas em até ${maxQtdDaysLate} dias`)

		const result = await this.fb.query(`
            SELECT 
                EMP.NOMEFANTASIA,
                CLG.CODIGO,
                CLG.NOME,
                CLG.FONE,
                CLF.DATANASC,
                DCT.DOCUMENTO,
                PAR.PARCELA,
                DCT.QTDPARCELA,
                DCT.EMISSAO,
                PAR.DATABAIXA,
                PAR.VALORPENDENTE AS VALORTOTAL,
                PAR.VENCIMENTO,
                CASE 
                    WHEN COALESCE(CLI.JUROSATRASO, 0) = 0 THEN PARAM.JUROS
                    ELSE CLI.JUROSATRASO
                END AS JUROS,
                PARAM.TIPOJURO,
                PARAM.MULTA,
                CURRENT_DATE AS DATAATUAL,
                CASE
                    WHEN PAR.SITUACAO = 'B' THEN 'BOLETO'
                    ELSE 'DUPLICATA'
                END AS TIPO,
                PAR.EMPRESA
            FROM TRECPARCELA PAR
            LEFT JOIN TRECDOCUMENTO DCT 
                ON DCT.EMPRESA = PAR.EMPRESA
            AND DCT.CLIENTE = PAR.CLIENTE
            AND DCT.TIPO = PAR.TIPO
            AND DCT.DOCUMENTO = PAR.DOCUMENTO
            LEFT JOIN TRECTIPODOCUMENTO TD 
                ON TD.CODIGO = DCT.TIPO
            LEFT JOIN TVENPEDIDO PED 
                ON PED.EMPRESA = PAR.EMPRESA
            AND PED.CODIGO = PAR.DOCUMENTO
            AND PED.CLIENTE = PAR.CLIENTE
            LEFT JOIN TRECCLIENTE CLI 
                ON CLI.EMPRESA = DCT.EMPRESA
            AND CLI.CODIGO = DCT.CLIENTE
            LEFT JOIN TRECCLIENTEGERAL CLG 
                ON CLG.CODIGO = DCT.CLIENTE
            LEFT JOIN TRECPARAMETRO PARAM 
                ON PARAM.EMPRESA = DCT.EMPRESA
            LEFT JOIN TRECPFISICA CLF 
                ON CLF.CODIGO = CLG.CODIGO
            LEFT JOIN TGEREMPRESA EMP 
                ON EMP.CODIGO = PAR.EMPRESA
            WHERE PAR.SITUACAO <> 'A'
            AND CLI.CODIGO NOT IN (88888, 99999, 99997, 99998)
            AND PAR.IDRENEGOCIACAO IS NULL
            AND CLI.ATIVO = 'S'
            AND TD.CARTAO IS NULL
            AND PAR.VENCIMENTO BETWEEN '${DaysAgo}' AND '${now}'
            GROUP BY 
                EMP.NOMEFANTASIA,
                CLG.CODIGO,
                CLG.NOME,
                CLG.FONE,
                CLF.DATANASC,
                DCT.DOCUMENTO,
                PAR.PARCELA,
                DCT.QTDPARCELA,
                DCT.EMISSAO,
                PAR.DATABAIXA,
                PAR.VALORPENDENTE,
                PAR.VENCIMENTO,
                PARAM.JUROS,
                CLI.JUROSATRASO,
                PARAM.TIPOJURO,
                PARAM.MULTA,
                PAR.SITUACAO,
                PAR.EMPRESA
            ORDER BY 
                TIPO,
                CLG.NOME,
                PAR.PARCELA,
                PAR.VENCIMENTO;                 
        `)

		if (result.length > 0) {
			this.count = 0

			for (const charge of result) {
				let customer = await this.customerService.findOneCustomer(charge.CODIGO)

				if (!customer) {
					customer = await this.customerService.createCustomer({
						id: charge.CODIGO,
						name: charge.NOME,
						contact: charge.FONE,
						bithday: charge.DATANASC,
						lastPurchaseDate: new Date('1900-01-01T04:00:00.000Z'),
						lastPurchaseValue: 0,
						company: charge.NOMEFANTASIA,
					})
				} else if (!customer.active) {
					continue
				} else {
					await this.customerService.updateCustomer(charge.CODIGO, {
						name: charge.NOME,
						contact: charge.FONE,
						bithday: charge.DATANASC,
					})
				}

				if (!charge.FONE) {
					this.logger.warn(`Ciente ${charge.NOME} sem CONTATO`)
					await this.customerService.updateCustomer(customer.id, { active: false })
					continue
				}

				let exists = await this.chargeService.findOneCharge(`${charge.DOCUMENTO}/${charge.PARCELA}`)

				if (!exists) {
					await this.chargeService.createCharge({
						id: `${charge.DOCUMENTO}/${charge.PARCELA}`,
						expiration: charge.VENCIMENTO,
						value: charge.VALORTOTAL,
						installment: charge.PARCELA,
						qtdInstallments: charge.QTDPARCELA,
						type: charge.TIPO.trim(),
						customerId: charge.CODIGO,
						paymentDate: charge.DATABAIXA,
						qtdSents: 0,
						fine: charge.MULTA,
						interest: charge.JUROS,
						interestType: charge.TIPOJURO,
						company: charge.NOMEFANTASIA,
					})
					this.count = this.count + 1
				} else {
					await this.chargeService.updateCharge(`${charge.DOCUMENTO}/${charge.PARCELA}`, {
						expiration: charge.VENCIMENTO,
						value: charge.VALORTOTAL,
						installment: charge.PARCELA,
						qtdInstallments: charge.QTDPARCELA,
						type: charge.TIPO.trim(),
						customerId: charge.CODIGO,
						paymentDate: charge.DATABAIXA,
						fine: charge.MULTA,
						interest: charge.JUROS,
						interestType: charge.TIPOJURO,
						company: charge.NOMEFANTASIA,
						active: charge.DATABAIXA ? false : true,
					})
				}
			}

			this.logger.warn(`Total de novas cobranças encontradas: ${this.count}`)
			this.resultMessage = `Total de novas cobranças encontradas: ${this.count}`
		} else {
			this.logger.warn(`Nenhuma cobrança encontrada`)
			this.resultMessage = `Nenhuma cobrança encontrada`
		}

		if (sendChargeMsg) {
			await this.sendChargeMsg()
				.then(() => {})
				.catch((err) => {
					this.logger.error(`Erro ao enviar mensagens: ${err}`)
				})
		}
	}

	async sendChargeMsg() {
		if (this.isSending) {
			this.logger.error('Envio de mensagens já em andamento')
			return
		}

		this.isSending = true

		try {
			this.emitStatus({
				running: true,
				hasError: false,
				errorMessage: undefined,
				lastRunAt: new Date(),
			})

			this.logger.warn(`Executando envio de mensagens`)

			const chargeConfig = await this.chargeService.findAllConfigs()

			if (!chargeConfig) {
				this.logger.error(`Configurações para envio de cobranças não encontradas`)
				this.notificationsGateway.sendAlert(`Configurações para envio de cobranças não encontradas`, 'error')
				this.emitStatus({
					running: false,
					hasError: true,
					errorMessage: 'Configurações para envio de cobranças não encontradas',
				})
				return
			}

			const whatsAppClientID = chargeConfig.runInstance

			if (whatsAppClientID === '') {
				this.logger.error('Envio não realizado, adicione uma conta de WhatsApp!')
				this.notificationsGateway.sendAlert(
					`Envio de cobranças não realizado, adicione uma conta de WhatsApp!`,
					'error',
				)
				this.emitStatus({
					running: false,
					hasError: true,
					errorMessage: 'Nenhuma conta WhatsApp configurada',
				})
				return
			}

			const runAuto = chargeConfig.runAuto
			this.lastEnabled = runAuto

			if (!runAuto) {
				this.logger.debug(`Envio automático não iniciado: runAuto: ${runAuto}`)
				this.emitStatus({
					running: false,
					hasError: false,
				})
				return
			}

			const msPerDay = 24 * 60 * 60 * 1000
			const now = new Date()

			const charges = await this.chargeService.findAllCharge()
			const validCharges = charges.filter(
				(charge) => charge.customer.active && charge.customer.sendCharge && charge.active,
			)
			const chargesRoles = await this.chargeService.findAllChargeRoles()
			const sortedRoles = (chargesRoles || [])
				.slice()
				.sort((a, b) => Number(a.qtdDaysLate) - Number(b.qtdDaysLate))
			const welcomeSentInRun = new Set<string>()

			// Processamento em lotes
			const batchSize = 20
			for (let i = 0; i < validCharges.length; i += batchSize) {
				const batchNumber = Math.floor(i / batchSize) + 1
				const totalBatches = Math.ceil(validCharges.length / batchSize)
				this.logger.log(`Processando lote ${batchNumber} de ${totalBatches}`)
				const batch = validCharges.slice(i, i + batchSize)
				for (let batchIndex = 0; batchIndex < batch.length; batchIndex++) {
					const charge = batch[batchIndex]
					this.logger.debug(`[Lote ${batchNumber}/${totalBatches}] Item ${batchIndex + 1}/${batch.length}`)

					if (charge.paymentDate) {
						this.logger.debug(`Cobrança ${charge.id} já foi paga em ${charge.paymentDate}, ignorando...`)
						continue
					}

					const freshCustomer = await this.customerService.findOneCustomer(charge.customer.id)
					if (!freshCustomer || !freshCustomer.active || !freshCustomer.sendCharge) {
						this.logger.debug(`Cliente ${charge.customer.name} inativo, ignorando...`)
						continue
					}

					if (!freshCustomer.contact) {
						this.logger.warn(`Ciente ${freshCustomer.name} sem CONTATO`)
						await this.customerService.updateCustomer(freshCustomer.id, { active: false })
						continue
					}

					const expirationDate = new Date(charge.expiration)
					const daysLate = Math.floor((now.getTime() - expirationDate.getTime()) / msPerDay)

					const isSameDay =
						charge.lastSentDate && new Date(charge.lastSentDate).toDateString() === now.toDateString()

					if (daysLate < 0 || isSameDay) {
						this.logger.debug(
							`Cobrança ${charge.id} com vencimento em ${charge.expiration}, dias de atraso: ${daysLate}, última mensagem enviada em ${charge.lastSentDate}, ignorando...`,
						)
						continue
					}

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

					if (matchedRole?.id === charge.lastChargeRoleId) {
						this.logger.debug(
							`Cobrança ${charge.id} com vencimento em ${charge.expiration}, dias de atraso: ${daysLate}, última mensagem enviada para função de cobrança ${matchedRole!.description}, ignorando...`,
						)
						continue
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
							nomeCliente: freshCustomer.name,
							diasAtraso: daysLate,
							valorPendente: Number(charge.value).toFixed(2),
							valorTotal: Number(interest + fine + Number(charge.value)).toFixed(2),
							vencimento: formatDate(charge.expiration.toString()),
							parcela: charge.installment,
							qtdParcelas: charge.qtdInstallments,
							tipoDocumento: charge.type,
							qtdCobrancas: charge.qtdSents + 1,
							numeroDocumento: charge.id,
							juros: interest.toFixed(2),
							multa: fine.toFixed(2),
						}

						const contactFormated = `55${formatContact(freshCustomer.contact)}`

						if (!freshCustomer.firstMessageSent && !welcomeSentInRun.has(freshCustomer.id)) {
							const welcomeMessageVars = {
								nomeEmpresa: charge.company,
								nomeCliente: freshCustomer.name,
							}

							const welcomeMessage = await this.chargeService.findWelcomeMessage()
							const mensagemFormated = formatMessage(welcomeMessage!.message, welcomeMessageVars)

							const sent = await this.whatsappService.sendMessage({
								clientId: whatsAppClientID,
								number: contactFormated,
								message: mensagemFormated,
							})

							if (sent.success) {
								this.logger.log(`Mensagem de boas-vindas enviada para ${freshCustomer.name}`)
								await this.customerService.updateCustomer(freshCustomer.id, { firstMessageSent: true })
								welcomeSentInRun.add(freshCustomer.id)

								this.logger.debug(
									`Aguardando 20 segundos antes de enviar mensagem de cobrança para ${freshCustomer.name}...`,
								)
								await new Promise((resolve) => setTimeout(resolve, 20_000))
							} else {
								this.logger.error(sent.error)
							}
						}

						const customerBeforeCharge = await this.customerService.findOneCustomer(freshCustomer.id)
						if (!customerBeforeCharge || !customerBeforeCharge.active || !customerBeforeCharge.sendCharge) {
							this.logger.debug(
								`Envio de cobrança para cliente ${freshCustomer.name} desativado, ignorando...`,
							)
							continue
						}

						const mensagemFormated = formatMessage(matchedRole.message.message, messageVars)

						const sent = await this.whatsappService.sendMessage({
							clientId: whatsAppClientID,
							number: contactFormated,
							message: mensagemFormated,
						})

						if (sent.success) {
							await this.chargeService.updateCharge(charge.id, {
								lastSentDate: formatTimeZone(new Date()),
								qtdSents: charge.qtdSents + 1,
								lastChargeRoleId: matchedRole.id,
							})
							await this.appMetaService.increment('charge_sent_count')
							this.logger.log(`Cobrança id: ${charge.id} enviada para ${freshCustomer.name}`)

							await new Promise((resolve) => setTimeout(resolve, 40_000))
						} else {
							if (sent?.error && sent.error.includes('is not on WhatsApp')) {
								this.logsService.createLog({
									customerId: freshCustomer.id,
									whatsappNumber: freshCustomer.contact,
									module: ChargeService.name,
									obs: 'O contato não tem WhatsApp, verifique o cadastro do cliente.',
								})

								this.customerService.disableCustomer(freshCustomer.id)
								this.logger.error(
									`O contato não tem WhatsApp, verifique o cadastro do cliente. Cliente ${freshCustomer.name} inativado!`,
								)

								continue
							}

							this.logger.error(sent.error)
						}
					}
				}
				if (i + batchSize < validCharges.length) {
					await this.queryChager(false)
					this.logger.log('Atualizando lista de cobranças para próximo lote...')
					await new Promise((resolve) => setTimeout(resolve, 60_000))
				}
			}

			this.emitStatus({
				running: false,
				lastSyncAt: new Date(),
			})
		} catch (err) {
			this.logger.error(`Erro ao enviar mensagem de cobrança: ${err}`)
			this.emitStatus({
				running: false,
				hasError: true,
				errorMessage: err.message,
			})

			return
		} finally {
			this.isSending = false
		}
		const totalSents = await this.appMetaService.get('charge_sent_count')

		this.emitStatus({
			sentCount: Number(totalSents) ?? 0,
			lastSyncAt: new Date(),
		})

		this.isSending = false
	}
}
