import { Body, Controller, Get, Patch } from '@nestjs/common'
import { UpdateConfigDto } from '../../core/config/dto/update-config.dto'
import { UpdateMessageVariableDto } from '../message-variables/dto/update-message-variable.dto'
import { MessageVariablesService } from '../message-variables/message-variables.service'
import { UpdateMessageDto } from '../messages/dto/update-message.dto'
import { SaleService } from './sale.service'

@Controller('sale')
export class SaleController {
	private readonly messageVariablesID = 'sale'

	constructor(
		private readonly saleService: SaleService,
		private readonly messageVariablesService: MessageVariablesService,
	) {}

	@Patch('config')
	async createNfeConfig(@Body() updateConfigDto: UpdateConfigDto) {
		return await this.saleService.updateConfig(updateConfigDto)
	}

	@Get('config')
	async findAllNfeConfig() {
		return await this.saleService.findConfigs()
	}

	@Patch('message')
	async updateNfeMessage(@Body() updateMessageDto: UpdateMessageDto) {
		return await this.saleService.updateMessage(updateMessageDto)
	}

	@Get('message')
	async findNfeMessage() {
		return await this.saleService.findMessage()
	}

	@Get('messageVariables')
	findAllMessageVariables() {
		return this.messageVariablesService.findByFunction(this.messageVariablesID)
	}

	@Patch('messageVariables')
	updateMessageVariables(@Body() updateMessageVariableDto: UpdateMessageVariableDto) {
		return this.messageVariablesService.update(this.messageVariablesID, updateMessageVariableDto)
	}
}
