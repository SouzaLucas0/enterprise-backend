import { Body, Controller, Get, Patch } from '@nestjs/common'
import { UpdateConfigDto } from '../../core/config/dto/update-config.dto'
import { UpdateMessageVariableDto } from '../message-variables/dto/update-message-variable.dto'
import { MessageVariablesService } from '../message-variables/message-variables.service'
import { UpdateMessageDto } from '../messages/dto/update-message.dto'
import { PdfService } from './pdf.service'

@Controller('pdf')
export class PdfController {
	private readonly nfeConfigId = 4
	private readonly bankSlipConfigId = 3
	private readonly nfeMessageVariablesID = 'nfe'
	private readonly bankSlipMessageVariablesID = 'bankSlip'
	constructor(
		private readonly pdfService: PdfService,
		private readonly messageVariablesService: MessageVariablesService,
	) {}

	@Patch('bankSlip/config')
	async createBankSlipConfig(@Body() updateConfigDto: UpdateConfigDto) {
		return await this.pdfService.updateConfigBankSlip(updateConfigDto)
	}

	@Get('bankSlip/config')
	async findAllBankSlipConfig() {
		return await this.pdfService.findConfigs(this.bankSlipConfigId)
	}

	@Get('bankSlip/message')
	async findBankSlipMessage() {
		return await this.pdfService.findBankSlipMessage()
	}

	@Patch('bankSlip/message')
	async updateBankSlipMessage(@Body() updateMessageDto: UpdateMessageDto) {
		return await this.pdfService.updateBankSlipMessage(updateMessageDto)
	}

	@Get('bankSlip/messageVariables')
	findAllBankSlipMessageVariables() {
		return this.messageVariablesService.findByFunction(this.bankSlipMessageVariablesID)
	}

	@Patch('bankSlip/messageVariables')
	updateBankSlipMessageVariables(@Body() updateMessageVariableDto: UpdateMessageVariableDto) {
		return this.messageVariablesService.update(this.bankSlipMessageVariablesID, updateMessageVariableDto)
	}

	@Patch('nfe/config')
	async createNfeConfig(@Body() updateConfigDto: UpdateConfigDto) {
		return await this.pdfService.updateConfigNfe(updateConfigDto)
	}

	@Get('nfe/config')
	async findAllNfeConfig() {
		return await this.pdfService.findConfigs(this.nfeConfigId)
	}

	@Get('nfe/message')
	async findNfeMessage() {
		return await this.pdfService.findNfeMessage()
	}

	@Patch('nfe/message')
	async updateNfeMessage(@Body() updateMessageDto: UpdateMessageDto) {
		return await this.pdfService.updateNfeMessage(updateMessageDto)
	}

	@Get('nfe/messageVariables')
	findAllNfeMessageVariables() {
		return this.messageVariablesService.findByFunction(this.nfeMessageVariablesID)
	}

	@Patch('nfe/messageVariables')
	updateNfeMessageVariables(@Body() updateMessageVariableDto: UpdateMessageVariableDto) {
		return this.messageVariablesService.update(this.nfeMessageVariablesID, updateMessageVariableDto)
	}
}
