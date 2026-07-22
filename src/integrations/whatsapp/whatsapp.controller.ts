import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { MessageVariablesService } from '../../features/message-variables/message-variables.service'
import { CreateWhatsappInstanceDto } from './dto/create-whatsapp-instance.dto'
import { SendMessageDto } from './dto/send-message.dto'
import { WhatsappService } from './whatsapp.service'

@ApiTags('whatsapp')
@Controller('whatsapp')
export class WhatsappController {
	private readonly messageVariablesID = 'welcome'
	constructor(
		private readonly whatsappService: WhatsappService,
		private readonly messageVariablesService: MessageVariablesService
	) {}

	@Post('instances')
	async createInstance(@Body() createWhatsappInstanceDto: CreateWhatsappInstanceDto) {
		return await this.whatsappService.createInstance(createWhatsappInstanceDto)
	}

	@Get('instances')
	async getAllInstances() {
		return await this.whatsappService.getAllInstances()
	}

	@Get('instances/:clientId')
	async getInstanceStatus(@Param('clientId') clientId: string) {
		return await this.whatsappService.getInstanceStatus(clientId)
	}

	@Delete('instances/:clientId')
	async deleteInstance(@Param('clientId') clientId: string) {
		return await this.whatsappService.deleteInstance(clientId)
	}

	@Get('qrcode')
	async getQr(@Query('clientId') clientId: string) {
		return this.whatsappService.getQrCode(clientId)
	}

	@Post('sendMessage')
	async send(@Body() sendMessageDto: SendMessageDto) {
		return this.whatsappService.sendMessage(sendMessageDto)
	}

	@Get('messageVariables')
	async findAllMessageVariables() {
		return await this.messageVariablesService.findByFunction(this.messageVariablesID)
	}
}
