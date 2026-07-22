import { BadGatewayException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CustomerService } from '../customer/customer.service'
import { CreateLogDto } from './dto/create-log.dto'
import { RemoveLogDto } from './dto/remove-log.dto'
import { UpdateLogDto } from './dto/update-log.dto'
import { Log } from './entities/log.entity'

@Injectable()
export class LogsService {
	private readonly logger = new Logger(LogsService.name)

	constructor(
		@InjectRepository(Log)
		private readonly logRepository: Repository<Log>,

		private readonly customerService: CustomerService,
	) {}

	async createLog(createLogDto: CreateLogDto) {
		const customer = await this.customerService.findOneCustomer(createLogDto.customerId)

		if (!customer) {
			this.logger.error(`Cliente ID: ${createLogDto.customerId} não encontrado`)
			throw new NotFoundException(`Cliente ID: ${createLogDto.customerId} não encontrado`)
		}

		if (!createLogDto) {
			this.logger.error(`Dados de log não enviados`)
			throw new BadGatewayException(`Dados de log não enviados`)
		}

		const log = this.logRepository.create({
			whatsappNumber: createLogDto.whatsappNumber,
			obs: createLogDto.obs,
			module: createLogDto.module,
			customer,
		})

		return this.logRepository.save(log)
	}

	async findAllLogs() {
		return this.logRepository.find({
			relations: ['customer'],
			order: { createdAt: 'DESC' },
		})
	}

	async findOneLog(id: number): Promise<Log> {
		const log = await this.logRepository.findOne({
			where: { id },
			relations: ['customer'],
		})

		if (!log) {
			this.logger.error(`Log #${id} não encontrado`)
			throw new NotFoundException(`Log #${id} não encontrado`)
		}

		return log
	}

	async updateLog(id: number, updateLogDto: UpdateLogDto) {
		const log = await this.findOneLog(id)

		Object.assign(log, updateLogDto)

		return this.logRepository.save(log)
	}

	async removeLogs(removeLogDto: RemoveLogDto) {
		const result = await this.logRepository.delete(removeLogDto)

		if (result.affected === 0) {
			return { success: false, message: `Nenhum registro encontrado` }
		}

		return { success: true, message: `${result.affected} registro(s) removidos` }
	}

	async removeAllLogs() {
		const allLogs = await this.logRepository.find()

		if (allLogs.length === 0) {
			this.logger.warn('Nenhum log encontrado para remoção')
			return { success: false, message: 'Nenhum log encontrado para remoção' }
		}

		allLogs.forEach(async (log) => {
			await this.removeLogs({ module: log.module })
		})

		this.logger.warn(`${allLogs.length} log(s) removidos`)
	}
}
