import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AppMeta } from './app-meta.entity'

@Injectable()
export class AppMetaService {
	private readonly logger = new Logger(AppMetaService.name)

	constructor(
		@InjectRepository(AppMeta)
		private readonly appMetaRepository: Repository<AppMeta>,
	) {}

	async set(key: string, value: string): Promise<AppMeta> {
		let meta = await this.appMetaRepository.findOne({ where: { key } })

		if (meta) {
			meta.value = value
		} else {
			meta = this.appMetaRepository.create({ key, value })
		}

		const saved = await this.appMetaRepository.save(meta)
		return saved
	}

	async get(key: string): Promise<string | null> {
		const meta = await this.appMetaRepository.findOne({ where: { key } })
		return meta?.value ?? null
	}

	async getOrDefault(key: string, defaultValue: string): Promise<string> {
		const value = await this.get(key)
		return value ?? defaultValue
	}

	async getAll(): Promise<AppMeta[]> {
		return this.appMetaRepository.find()
	}

	async delete(key: string): Promise<boolean> {
		const result = await this.appMetaRepository.delete(key)

        if (result.affected && result.affected < 0) {
            this.logger.debug(`Meta não encontrada: ${key}`)
            return false
        }
        
        this.logger.debug(`Meta deletada: ${key}`)
		return true
	}

	async exists(key: string): Promise<boolean> {
		const count = await this.appMetaRepository.count({ where: { key } })
		return count > 0
	}

	async increment(key: string, amount: number = 1): Promise<number> {        
		const current = await this.get(key)

        if (current === null) {
           await this.set(key, amount.toString())
			return amount
        }

		const currentValue = parseInt(current ?? '0', 10)
		const newValue = currentValue + amount
		await this.set(key, newValue.toString())
		return newValue
	}

	async decrement(key: string, amount: number = 1): Promise<number> {
		return this.increment(key, -amount)
	}
}
