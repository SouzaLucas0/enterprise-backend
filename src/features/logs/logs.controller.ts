import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import { CreateLogDto } from './dto/create-log.dto'
import { RemoveLogDto } from './dto/remove-log.dto'
import { UpdateLogDto } from './dto/update-log.dto'
import { LogsService } from './logs.service'

@Controller('logs')
export class LogsController {
	constructor(private readonly logsService: LogsService) {}

	@Delete('removeAll')
	removeAll() {
		return this.logsService.removeAllLogs()
	}
		
	@Delete('removeLogs')
	removes(@Body() removeLogDto: RemoveLogDto) {
		return this.logsService.removeLogs(removeLogDto)
	}

	@Post()
	create(@Body() createLogDto: CreateLogDto) {
		return this.logsService.createLog(createLogDto)
	}

	@Get()
	findAll() {
		return this.logsService.findAllLogs()
	}

	@Get(':id')
	findOne(@Param('id') id: string) {
		return this.logsService.findOneLog(+id)
	}
	
	@Patch(':id')
	update(@Param('id') id: string, @Body() updateLogDto: UpdateLogDto) {
		return this.logsService.updateLog(+id, updateLogDto)
	}
}
