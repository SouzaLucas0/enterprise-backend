import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import { UpdateConfigDto } from '../../core/config/dto/update-config.dto'
import { UpdateMessageVariableDto } from '../message-variables/dto/update-message-variable.dto'
import { MessageVariablesService } from '../message-variables/message-variables.service'
import { ChargeService } from './charge.service'
import { CreateChargeRoleDto } from './dto/create-charge-role.dto'
import { CreateChargeDto } from './dto/create-charge.dto'
import { SendManualMessageDto } from './dto/send-manual-charge-message.dto'
import { UpdateChargeRoleDto } from './dto/update-charge-role.dto'
import { UpdateChargeDto } from './dto/update-charge.dto'

@Controller('charge')
export class ChargeController {
	private readonly messageVariablesID = 'charge'

	constructor(
		private readonly chargeService: ChargeService,
		private readonly messageVariablesService: MessageVariablesService,
	) {}

	@Get('messageVariables')
	async findAllMessageVariables() {
		return await this.messageVariablesService.findByFunction(this.messageVariablesID)
	}

	@Patch('messageVariables')
	async updateMessageVariables(@Body() updateMessageVariableDto: UpdateMessageVariableDto) {
		return await this.messageVariablesService.update(this.messageVariablesID, updateMessageVariableDto)
	}

	@Patch('config')
	async createConfig(@Body() updateConfigDto: UpdateConfigDto) {
		return await this.chargeService.updateConfig(updateConfigDto)
	}

	@Get('config')
	async findAllConfig() {
		return await this.chargeService.findAllConfigs()
	}

	@Post('sendManualChageMessage')
	async sendManualMessage(@Body() sendManualMessageDto: SendManualMessageDto) {
		return await this.chargeService.sendManualChargeMsg(sendManualMessageDto)
	}

	@Post()
	async create(@Body() createChargeDto: CreateChargeDto) {
		return await this.chargeService.createCharge(createChargeDto)
	}

	@Get()
	async findAll() {
		return await this.chargeService.findAllChargeToFront()
	}

	@Patch(':id')
	async update(@Param('id') id: string, @Body() updateChargeDto: UpdateChargeDto) {
		return await this.chargeService.updateCharge(id, updateChargeDto)
	}

	@Delete(':id')
	async remove(@Param('id') id: string) {
		return await this.chargeService.remove(id)
	}

	@Post('role')
	async createRole(@Body() createChargeRoleDto: CreateChargeRoleDto) {
		return await this.chargeService.createChargeRole(createChargeRoleDto)
	}

	@Get('role')
	async findAllRoles() {
		return await this.chargeService.findAllChargeRoles()
	}

	@Get('role/:id')
	async findOneRole(@Param('id') id: string) {
		return await this.chargeService.findOneChargeRole(+id)
	}

	@Patch('role/:id')
	async updateRole(@Param('id') id: string, @Body() updateChargeRoleDto: UpdateChargeRoleDto) {
		return await this.chargeService.updateChargeRole(+id, updateChargeRoleDto)
	}

	@Delete('role/:id')
	async removeRole(@Param('id') id: string) {
		return await this.chargeService.removeChargeRole(+id)
	}

	@Post('runFirebirdQuery')
	async runManualFirebird() {
		return await this.chargeService.runManualFirebird()
	}
}
