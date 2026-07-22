import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CreateWhatsappInstanceDto } from './dto/create-whatsapp-instance.dto'
import { UpdateWhatsappInstanceDto } from './dto/update-whatsapp-instance.dto'
import { WhatsappInstance } from './entities/whatsapp-instance.entity'

@Injectable()
export class WhatsappInstanceService {
	private readonly logger = new Logger('WhatsappInstanceService')

	constructor(
		@InjectRepository(WhatsappInstance)
		private readonly instanceRepository: Repository<WhatsappInstance>
	) {}

	async create(createDto: CreateWhatsappInstanceDto): Promise<WhatsappInstance> {		
		const isntance = this.instanceRepository.create({
			clientId: createDto.clientId,
			token: createDto.token,
			status: createDto.status,
			name: createDto.name,
		})
		const created = await this.instanceRepository.save(isntance)

		return created
	}

	async findAll(): Promise<WhatsappInstance[]> {
		return await this.instanceRepository.find({
			where: { isActive: true },
			order: { createdAt: 'DESC' }
		})
	}

	async findOne(clientId: string): Promise<WhatsappInstance | null> {
		return await this.instanceRepository.findOne({
			where: { clientId, isActive: true }
		})
	}

	async update(clientId: string, updateDto: UpdateWhatsappInstanceDto): Promise<WhatsappInstance | null> {
		await this.instanceRepository.update({ clientId }, updateDto)
		return await this.findOne(clientId)
	}

	async remove(clientId: string): Promise<void> {
		await this.instanceRepository.update({ clientId }, { isActive: false })
	}

	async hardDelete(clientId: string): Promise<void> {
		await this.instanceRepository.delete({ clientId })
	}
}