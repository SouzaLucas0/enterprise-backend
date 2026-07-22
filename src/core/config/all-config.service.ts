import { BadGatewayException, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UpdateConfigDto } from './dto/update-config.dto'
import { AllConfig } from './entities/config.entity'

@Injectable()
export class AllConfigService {
	private readonly logger = new Logger(AllConfigService.name)
	constructor(
		@InjectRepository(AllConfig)
		private readonly configRepository: Repository<AllConfig>,
	) {}

	async updateConfig(id: number, updateConfigDto: UpdateConfigDto) {
		if (!updateConfigDto) {
			this.logger.error('Dados de configuração não enviados')
			throw new BadGatewayException('Dados de configuração não enviados')
		}

		let config = await this.configRepository.findOne({
			where: { id: id },
		})

		if (!config) {
			config = this.configRepository.create({
				runAuto: true,
				runTime: '09:00',
				runFirebird: '08:00',
				runInstance: '',
			})
			this.logger.warn(`Configurações criadas`)
		}

		config.runAuto = updateConfigDto.runAuto ?? config.runAuto
		config.runTime = updateConfigDto.runTime ?? config.runTime
		config.runFirebird = updateConfigDto.runFirebird ?? config.runFirebird
		config.runInstance = updateConfigDto.runInstance ?? config.runInstance

		const updated = await this.configRepository.save(config)

		return updated
	}

	async findOne(id: number) {		
		if (!id) {
			this.logger.error('ID de configuração não enviado')
			return
		}

		const config = await this.configRepository.findOne({ where: { id } })

		if (!config) {
			this.logger.error(`Configuração ID: ${id} não encontrada`)
			return
		}
		
		return config
	}
}
