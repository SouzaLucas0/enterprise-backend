import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { MessageVariable } from '../../features/message-variables/entities/message-variable.entity'

@Injectable()
export class MessageVariablesSeed {
	private readonly logger = new Logger(MessageVariablesSeed.name)

	constructor(
		@InjectRepository(MessageVariable)
		private readonly messageVariblesRepository: Repository<MessageVariable>,
	) {}

	async run(): Promise<void> {
		const count = await this.messageVariblesRepository.count()

		const defaultMessageVariablesAnniversary: Partial<MessageVariable> = {
			variables: ['{{nomeEmpresa}}', '{{nomeCliente}}', '{{foneCliente}}', '{{dataNascimento}}'],
			function: 'anniversary',
		}

		const defaultMessageVariablesBankSlip: Partial<MessageVariable> = {
			variables: [
				'{{nomeEmpresa}}',
				'{{numeroPedido}}',
				'{{nomeCliente}}',
				'{{nossoNumero}}',
				'{{valorPendente}}',
				'{{vencimento}}',
			],
			function: 'bankSlip',
		}

		const defaultMessageVariablesCharge: Partial<MessageVariable> = {
			variables: [
				'{{nomeEmpresa}}',
				'{{nomeCliente}}',
				'{{diasAtraso}}',
				'{{valorPendente}}',
				'{{valorTotal}}',
				'{{vencimento}}',
				'{{parcela}}',
				'{{qtdParcelas}}',
				'{{tipoDocumento}}',
				'{{qtdCobrancas}}',
				'{{numeroDocumento}}',
				'{{juros}}',
				'{{multa}}',
			],
			function: 'charge',
		}

		const defaultMessageVariablesNfe: Partial<MessageVariable> = {
			variables: ['{{nomeEmpresa}}', '{{nomeCliente}}', '{{numeroNfe}}', '{{codigoPedido}}', '{{dataPedido}}'],
			function: 'nfe',
		}

		const defaultMessageVariablesSale: Partial<MessageVariable> = {
			variables: [
				'{{nomeEmpresa}}',
				'{{nomeCliente}}',
				'{{numeroPedido}}',
				'{{vendedor}}',
				'{{condicaoPagamento}}',
				'{{quantidadeParcelas}}',
				'{{parcelamento}}',
				'{{valorBruto}}',
				'{{valorLiquido}}',
				'{{valorDesconto}}',
				'{{valorDespesas}}',
				'{{valorGarantia}}',
				'{{valorEntrada}}',
				'{{percentualDesconto}}',
				'{{dataVenda}}',
				'{{transportadora}}',
				'{{placaTransportadora}}',
				'{{tipoFrete}}',
				'{{valorFrete}}',
				'{{quantidadeVolumes}}',
				'{{pesoBruto}}',
				'{{pesoLiquido}}',
				'{{observacao}}',
				'{{produtosComValor}}',
				'{{produtosSemValor}}',
			],
			function: 'sale',
		}

		if (count > 0) {
			await this.updateVariables(defaultMessageVariablesAnniversary)
			await this.updateVariables(defaultMessageVariablesBankSlip)
			await this.updateVariables(defaultMessageVariablesCharge)
			await this.updateVariables(defaultMessageVariablesNfe)
			await this.updateVariables(defaultMessageVariablesSale)
			this.logger.verbose(`MessageVariables atualizadas`)
			return
		}

		await this.messageVariblesRepository.save(defaultMessageVariablesAnniversary)
		await this.messageVariblesRepository.save(defaultMessageVariablesBankSlip)
		await this.messageVariblesRepository.save(defaultMessageVariablesCharge)
		await this.messageVariblesRepository.save(defaultMessageVariablesNfe)
		await this.messageVariblesRepository.save(defaultMessageVariablesSale)

		this.logger.verbose(`MessageVariables criadas`)
	}

	async updateVariables(variables: Partial<MessageVariable>) {
		const messageVariable = await this.messageVariblesRepository.findOne({
			where: { function: variables.function },
		})

		if (!messageVariable) {
			await this.messageVariblesRepository.save(variables)
			return
		}

		Object.assign(messageVariable, variables)

		return this.messageVariblesRepository.save(messageVariable)
	}
}
