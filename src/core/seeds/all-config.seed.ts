import { Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { AllConfig } from '../config/entities/config.entity'

@Injectable()
export class AllConfigSeed {
	private readonly logger = new Logger(AllConfigSeed.name)

	constructor(private readonly dataSource: DataSource) {}

	async run(): Promise<void> {
		const repo = this.dataSource.getRepository(AllConfig)

		const count = await repo.count()
		if (count > 0) {
			return
		}

		const configs = repo.create([
			{
				id: 1,
				runAuto: false,
				runTime: '09:00',
				runFirebird: '08:00',
				runInstance: ' ',
			},
			{
				id: 2,
				runAuto: false,
				runTime: '09:00',
				runFirebird: '08:00',
				runInstance: ' ',
			},
			{
				id: 3,
				runAuto: false,
				runTime: '00:05',
				runFirebird: '08:00',
				runInstance: ' ',
			},
			{
				id: 4,
				runAuto: false,
				runTime: '00:05',
				runFirebird: '08:00',
				runInstance: ' ',
			},
			{
				id: 5,
				runAuto: false,
				runTime: '00:05',
				runFirebird: '08:00',
				runInstance: ' ',
			},
		])

		await repo.save(configs)

		this.logger.verbose('Seed de AllConfig executado com sucesso')
	}
}
