import { Body, Controller, Get, Patch, Post } from '@nestjs/common'
import { ApiBody } from '@nestjs/swagger'
import { UpdateConfigDto } from '../../core/config/dto/update-config.dto'
import { UpdateMessageVariableDto } from '../message-variables/dto/update-message-variable.dto'
import { MessageVariablesService } from '../message-variables/message-variables.service'
import { AnniversaryService } from './anniversary.service'
import { CreateSentMessageDto } from './dto/create-sent-message.dto'
import { SendAnniversaryMessageDto } from './dto/sendAnniversaryMessage.dto'
import { SentMessageResponseDto } from './dto/sent-message-response.dto'

@Controller('anniversary')
export class AnniversaryController {
	private readonly messageVariablesID = 'anniversary'

	constructor(
		private readonly anniversaryService: AnniversaryService,
		private readonly messageVariablesService: MessageVariablesService,
	) {}

	@Patch('config')
	async createConfig(@Body() updateConfigDto: UpdateConfigDto) {
		return await this.anniversaryService.updateConfig(updateConfigDto)
	}

	@Get('config')
	async findAllConfig() {
		return await this.anniversaryService.findAllConfigs()
	}

	@Get('birthdayCelebrants')
	async findBirthdayCelebrants() {
		return await this.anniversaryService.findBirthdayCelebrants()
	}

	@Post('sentBirthdayCelebrants')
	async createSentMessage(@Body() createSentMessageDto: CreateSentMessageDto) {
		const created = await this.anniversaryService.createSentMessage(createSentMessageDto)
		return new SentMessageResponseDto(created)
	}

	@Get('sentBirthdayCelebrants')
	async findAllSentMessages() {
		const sentMessags = await this.anniversaryService.findAllSentMessages()
		return sentMessags.map((message) => new SentMessageResponseDto(message))
	}

	@Post('sendManualAnniversaryMessage')
	@ApiBody({ type: SendAnniversaryMessageDto })
	async send(@Body() body: SendAnniversaryMessageDto) {
		const { clientId, customerId, number, message } = body
		return await this.anniversaryService.sendManualAnniversaryMessage({ clientId, customerId, number, message })
	}

	@Get('messageVariables')
	async findAllMessageVariables() {
		return await this.messageVariablesService.findByFunction(this.messageVariablesID)
	}

	@Patch('messageVariables')
	async updateMessageVariables(@Body() updateMessageVariableDto: UpdateMessageVariableDto) {
		return await this.messageVariablesService.update(this.messageVariablesID, updateMessageVariableDto)
	}

	@Post('runFirebirdQuery')
	async runManualFirebird() {
		return await this.anniversaryService.runManualFirebird()
	}
}
