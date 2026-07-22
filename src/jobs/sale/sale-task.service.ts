import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import { JobStatusType } from '../../@types/jobStatusType'
import { AppMetaService } from '../../core/app-meta/app-meta.service'
import { CustomerService } from '../../features/customer/customer.service'
import { LogsService } from '../../features/logs/logs.service'
import { SaleService } from '../../features/sale/sale.service'
import { FirebirdService } from '../../integrations/firebird/firebird.service'
import { NotificationsGateway } from '../../integrations/notifications/notifications.gateway'
import { WhatsappService } from '../../integrations/whatsapp/whatsapp.service'
import { formatContact } from '../../shared/utils/formatContact'
import { formatDate } from '../../shared/utils/formatDate'
import { formatMessage } from '../../shared/utils/formatMessage'
import { normalizeTimeFormat } from '../../shared/utils/normalizeTimeFormat'

@Injectable()
export class TaskSaleService {
	private readonly logger = new Logger(`Envio de Vendas`)
	private readonly cronSendSale = 'cron-send-sale'
	private readonly jobKey = 'sale'
	private readonly jobTitle = 'Vendas'
	private lastEnabled = false
	private scanIntervalMs = 10 * 60 * 1000
	private isSending = false

	constructor(
		private readonly fb: FirebirdService,
		private readonly schedulerRegistry: SchedulerRegistry,
		private readonly whatsappService: WhatsappService,
		private readonly customerService: CustomerService,
		@Inject(forwardRef(() => SaleService))
		private readonly saleService: SaleService,
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
		const config = await this.saleService.findConfigs()

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
		const job = setInterval(() => this.sendSale(), this.scanIntervalMs)
		this.schedulerRegistry.addInterval(this.cronSendSale, job)
	}

	private toNumber(value: any): number {
		if (typeof value === 'number') return value
		if (typeof value === 'string') {
			let cleaned = value.trim()
			if (cleaned.includes(',')) {
				cleaned = cleaned.replace(/\./g, '').replace(',', '.')
			}
			const num = parseFloat(cleaned)
			return isNaN(num) ? 0 : num
		}
		return 0
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
		const exists = intervals.includes(this.cronSendSale)

		if (runAuto === false) {
			if (exists) {
				this.schedulerRegistry.deleteInterval(this.cronSendSale)
			}
			this.lastEnabled = false
			this.logger.debug(`Envio automático desativado`)
			this.emitStatus({ enabled: this.lastEnabled })
			return
		}

		if (runAuto === true) {
			if (exists) {
				this.schedulerRegistry.deleteInterval(this.cronSendSale)
			}

			this.createDynamicCron()
			this.lastEnabled = true
			this.logger.debug(`Envio automático ativado`)
			this.emitStatus({ enabled: this.lastEnabled })
			return
		}

		if (exists) {
			this.schedulerRegistry.deleteInterval(this.cronSendSale)
		}

		this.createDynamicCron()
		this.emitStatus({ enabled: this.lastEnabled })
	}

	async sendSale() {
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

			const config = await this.saleService.findConfigs()

			if (!config) {
				this.logger.error(`Configurações para envio de vendas não encontradas`)
				this.notificationsGateway.sendAlert(`Configurações para envio de vendas não encontradas`, 'error')
				this.emitStatus({
					running: false,
					hasError: true,
					errorMessage: 'Configurações para envio de vendas não encontradas',
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

			const now = new Date()
				.toLocaleDateString('pt-BR', { timeZone: 'America/Manaus' })
				.split('/')
				.reverse()
				.join('-')

			const result = await this.fb.query(`
				SELECT
				EMP.NOMEFANTASIA,
				EMP.CODIGO AS CODEMPRESA,
				PED.CODIGO,
				PED.DATA,
				PED.HORA,
				PED.CLIENTE,
				CLG.NOME,
				CLG.FONE,
				CLF.DATANASC,
				PGT.DESCRICAO AS CONDPAGAMENTO,
				PGT.QTDPARCELA,
				VND.NOME AS VENDEDOR,
				(PED.VALORBRUTO - (PED.FRETE + PED.DESPESAS)) AS VALORBRUTO,
				PED.VALORDESCONTO,
				PED.PERCDESC,
				PED.VALORLIQUIDO,
				PED.GARANTIA,
				PED.ENTRADA,
				TPR.NOME AS TRANSPORTADORA,
				TPR.PLACA AS TRANSPORTADORAPLACA,
				CASE PED.TIPOFRETE
					WHEN 0 THEN 'EMITENTE'
					WHEN 1 THEN 'DESTINATÁRIO'
					WHEN 2 THEN 'TERCEIROS'
					WHEN 3 THEN 'PRÓPRIO DO REMETENTE'
					WHEN 4 THEN 'PRÓPRIO DO DESTINATÁRIO'
					WHEN 9 THEN 'SEM FRETE'
				END AS "TIPO FRETE",
				PED.FRETE,
				PED.QTDEVOLUMES,
				PED.PESOBRUTO,
				PED.PESOLIQUIDO,
				PED.DESPESAS,
				PED.OBSERVACAO

				FROM TVENPEDIDO PED
				LEFT OUTER JOIN TRECCLIENTEGERAL CLG ON (CLG.CODIGO = PED.CLIENTE)
				LEFT OUTER JOIN TRECPFISICA CLF ON (CLF.CODIGO = CLG.CODIGO)
				LEFT OUTER JOIN TESTCONDPAGVENDA PGT ON (PGT.CODIGO = PED.CONDICAOPAGTO)
				LEFT OUTER JOIN TVENTRANSPORTADOR TPR ON (TPR.CODIGO = PED.IDTRANSPORTADOR)
				LEFT OUTER JOIN TGEREMPRESA EMP ON (EMP.CODIGO = PED.EMPRESA)
				LEFT OUTER JOIN TVENVENDEDOR VND ON (VND.CODIGO = PED.VENDEDOR)

				WHERE PED.DATA = '${now}'
				AND PED.CLIENTE NOT IN (88888, 99999, 99997, 99998)
				AND PED.status = 'EFE'
				`)

			if (result.length > 0) {
				let count = 0
				for (const order of result) {
					let customer = await this.customerService.findOneCustomer(order.CLIENTE)

					if (!customer) {
						customer = await this.customerService.createCustomer({
							id: order.CLIENTE,
							name: order.NOME,
							contact: order.FONE,
							bithday: order.DATANASC,
							lastPurchaseDate: new Date('1900-01-01T04:00:00.000Z'),
							lastPurchaseValue: 0,
							company: order.NOMEFANTASIA,
						})
					} else {
						await this.customerService.updateCustomer(order.CLIENTE, {
							name: order.NOME,
							contact: order.FONE,
							bithday: order.DATANASC,
						})
					}

					if (!customer.active || !customer.sendSale) continue

					if (!order.FONE) {
						this.logger.warn(`Ciente ${order.NOME} sem CONTATO`)
						await this.customerService.updateCustomer(customer.id, { active: false })
						continue
					}

					let sale = await this.saleService.findOneSale(`${order.CODIGO}`)

					if (sale && sale.sentSale !== false) continue

					if (!sale) {
						sale = await this.saleService.createSale({
							id: order.CODIGO,
							seller: order.VENDEDOR,
							companyID: order.CODEMPRESA,
							companyName: order.NOMEFANTASIA,
							paymentMethod: order.CONDPAGAMENTO,
							installments: order.QTDPARCELA,
							grossValue: order.VALORBRUTO,
							netValue: order.VALORLIQUIDO,
							discount: order.VALORDESCONTO,
							discountPercent: order.PERCDESC,
							date: order.DATA,
							hour: order.HORA,
							transportName: order.TRANSPORTADORA,
							transportPlate: order.TRANSPORTADORAPLACA,
							freightType: order.TIPOFRETE,
							freightValue: order.FRETE,
							packageQuantity: order.QTDEVOLUMES,
							grossWeight: order.PESOBRUTO,
							netWeight: order.PESOLIQUIDO,
							expenses: order.DESPESAS,
							warranty: order.GARANTIA,
							entryValue: order.ENTRADA,
							observation: order.OBSERVACAO,
							customerId: order.CLIENTE,
							sentSale: true,
						})
					}

					if (!sale) {
						this.logger.error(`Error: Venda: ${order.CODIGO} não cadastrada`)
						continue
					}

					let installment: string | null = null

					if (sale.installments > 0) {
						installment = await this.buildInstallmentsMessage(Number(sale.id), sale.companyID)
					}

					const productsWithValues = await this.buildProductsMessage(Number(sale.id), sale.companyID, true)
					const productsWithoutValues = await this.buildProductsMessage(
						Number(sale.id),
						sale.companyID,
						false,
					)

					const messageVars = {
						nomeEmpresa: sale.companyName,
						nomeCliente: sale.customer.name,
						numeroPedido: sale.id,
						vendedor: sale.seller,
						condicaoPagamento: sale.paymentMethod,
						quantidadeParcelas: sale.installments,
						parcelamento: installment,
						valorBruto: this.toNumber(sale.grossValue).toFixed(2),
						valorLiquido: this.toNumber(sale.netValue).toFixed(2),
						valorDesconto: this.toNumber(sale.discount).toFixed(2),
						valorDespesas: this.toNumber(sale.expenses).toFixed(2),
						valorGarantia: this.toNumber(sale.warranty).toFixed(2),
						valorEntrada: this.toNumber(sale.entryValue).toFixed(2),
						percentualDesconto: sale.discountPercent,
						dataVenda: formatDate(new Date(sale.date).toISOString().split('T')[0]),
						transportadora: sale.transportName,
						placaTransportadora: sale.transportPlate,
						tipoFrete: sale.freightType,
						valorFrete: this.toNumber(sale.freightValue).toFixed(2),
						quantidadeVolumes: sale.packageQuantity,
						pesoBruto: sale.grossWeight,
						pesoLiquido: sale.netWeight,
						observacao: sale.observation,
						produtosComValor: productsWithValues,
						produtosSemValor: productsWithoutValues,
					}

					const message = await this.saleService.findMessage()

					if (!message) {
						this.logger.error(`Menssagem não encontrada`)
						this.emitStatus({
							running: false,
							hasError: true,
							errorMessage: 'Mensagem nao encontrada',
						})
						return false
					}

					const contactFormated = `55${formatContact(sale.customer.contact)}`

					if (customer.firstMessageSent === false) {
						const welcomeMessageVars = {
							nomeEmpresa: sale.companyName,
							nomeCliente: sale.customer.name,
						}
						
						const welcomeMessage = await this.saleService.findWelcomeMessage()
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
						this.saleService.updateSale(sale.id, { sentSale: true })
						await this.appMetaService.increment('sale_sent_count')
						this.logger.log(`Venda enviada para ${customer.name}`)
						count = count + 1
					} else {
						this.logger.error(sent.error)

						if (sent?.error && sent.error.includes('is not on WhatsApp')) {
							this.logsService.createLog({
								customerId: customer.id,
								whatsappNumber: customer.contact,
								module: TaskSaleService.name,
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
					this.logger.warn(`${count} vendas enviadas`)
				} else {
					this.logger.warn(`Nenhuma venda enviada`)
				}
			} else {
				this.logger.warn(`Nenhuma venda para envio encontrada`)
			}

			this.emitStatus({
				running: false,
				lastSyncAt: new Date(),
			})
		} catch (err) {
			this.logger.error(`Erro ao enviar vendas: ${err}`)
			this.notificationsGateway.sendAlert(`Erro ao enviar vendas: ${err.message}`, 'error')
			this.emitStatus({
				running: false,
				hasError: true,
				errorMessage: err.message,
			})
		} finally {
			const totalSents = await this.appMetaService.get('sale_sent_count')

			this.emitStatus({
				sentCount: Number(totalSents) ?? 0,
				lastSyncAt: new Date(),
			})

			this.isSending = false
		}
	}

	async buildInstallmentsMessage(sale: number, companyID: number): Promise<string> {
		let installment: string

		const result = await this.fb.query(`
			SELECT
			PAR.PARCELA ||'/' || (
				SELECT MAX(P.PARCELA)
				FROM TVENPARCELA P
				WHERE P.EMPRESA = PAR.EMPRESA
				AND P.PEDIDO = PAR.PEDIDO
			) AS PARCELA,
			PAR.VCTO AS "VENCIMENTO",
			CAST(
				(PAR.VALOR - (
				SELECT
					(COALESCE(PED.VALORISSQNRETIDO, 0) /
					(SELECT COUNT(P.PARCELA)
					FROM TVENPARCELA P
					WHERE P.EMPRESA = PED.EMPRESA
					AND P.PEDIDO = PED.CODIGO))
				FROM TVENPEDIDO PED
				WHERE PED.EMPRESA = PAR.EMPRESA
					AND PED.CODIGO = PAR.PEDIDO
				)) AS NUMERIC(15,2)
			) AS VALOR
			FROM TVENPARCELA PAR
			WHERE PAR.EMPRESA = ${companyID}
			AND PAR.PEDIDO = ${sale}
		`)

		if (!result || result.length === 0) {
			return 'Nenhum parcelamento encontrado'
		}

		const header = 'PARCELA – VENCIMENTO – VALOR'

		installment = [
			'Parcelamento: ',
			header,
			...result.map((row) => {
				const parcela = row.PARCELA.toString().padStart(2, '0')
				const vencimento = formatDate(new Date(row.VENCIMENTO).toISOString().split('T')[0])
				const valor = Number(row.VALOR).toLocaleString('pt-BR', {
					style: 'currency',
					currency: 'BRL',
				})

				return `${parcela} – ${vencimento} – ${valor}`
			}),
		].join('\n')

		return installment
	}

	async buildProductsMessage(sale: number, companyId: number, values: boolean): Promise<string> {
		const result = await this.fb.query(`
			SELECT
			COALESCE(amb.quantidade, prod.qtde) AS QTD,
			prodg.descricaoreduzida AS DESCRICAO,
			prod.vendido AS VALORUNITARIO,
			(
				COALESCE(amb.quantidade, prod.qtde) *
				prod.vendido
			) AS VALORTOTAL
			FROM TVENPEDIDO ped
			LEFT OUTER JOIN TVENPRODUTO prod
			ON prod.empresa = ped.empresa
			AND prod.pedido = ped.codigo
			LEFT OUTER JOIN TESTPRODUTOGERAL prodg
			ON prodg.codigo = prod.produto
			LEFT OUTER JOIN TVENPRODUTOAMBIENTE amb
			ON amb.empresa = prod.empresa
			AND amb.pedido = prod.pedido
			AND amb.produto = prod.produto
			AND amb.identificadorproduto = prod.identificador
			WHERE ped.empresa = ${companyId}
			AND ped.codigo = ${sale}
  		`)

		if (!result || result.length === 0) {
			return 'Nenhum produto encontrado'
		}

		return result
			.map((row) => {
				const qtd = Number(row.QTD).toString().padStart(2, '0')
				const produto = row.DESCRICAO

				const valorUnitario = Number(row.VALORUNITARIO).toLocaleString('pt-BR', {
					style: 'currency',
					currency: 'BRL',
				})

				const valorTotal = Number(row.VALORTOTAL).toLocaleString('pt-BR', {
					style: 'currency',
					currency: 'BRL',
				})

				if (values) {
					return `${qtd} x ${produto} - ${valorUnitario} = ${valorTotal}`
				}

				return `${qtd} x ${produto}`
			})
			.join('\n')
	}
}
