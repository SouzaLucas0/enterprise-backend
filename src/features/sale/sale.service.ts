import {
	ForbiddenException,
	forwardRef,
	Inject,
	Injectable,
	InternalServerErrorException,
	Logger,
	NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { AllConfigService } from '../../core/config/all-config.service'
import { UpdateConfigDto } from '../../core/config/dto/update-config.dto'
import { TaskSaleService } from '../../jobs/sale/sale-task.service'
import { Repository } from 'typeorm'
import { CustomerService } from '../customer/customer.service'
import { UpdateMessageDto } from '../messages/dto/update-message.dto'
import { MessagesService } from '../messages/messages.service'
import { CreateSaleDto } from './dto/create-sale.dto'
import { UpdateSaleDto } from './dto/update-sale.dto'
import { Sale } from './entities/sale.entity'

@Injectable()
export class SaleService {
	private readonly logger = new Logger(SaleService.name)
	private readonly saleConfigId = 5
	private readonly saleMessageId = 4

	constructor(
		@InjectRepository(Sale)
		private readonly saleRepository: Repository<Sale>,
		@Inject(forwardRef(() => TaskSaleService))
		private readonly taskSaleService: TaskSaleService,
		private readonly customerService: CustomerService,
		private readonly allConfigService: AllConfigService,
		private readonly messagesService: MessagesService,
	) {}

	async createSale(createSaleDto: CreateSaleDto) {
		if (!createSaleDto) {
			this.logger.error(`Dados da venda não enviados`)
			return false
		}

		const customer = await this.customerService.findOneCustomer(createSaleDto.customerId)

		if (!customer) {
			this.logger.error(`Cliente ID: ${createSaleDto.id} não encontrado`)
			return false
		}

		if (!customer.active) {
			this.logger.warn(`Ciente ${customer.name} inativo`)
			throw new ForbiddenException(`Ciente ${customer.name} inativo`)
		}

		const sale = this.saleRepository.create({
			id: createSaleDto.id,
			companyName: createSaleDto.companyName,
			companyID: createSaleDto.companyID,
			seller: createSaleDto.seller,
			paymentMethod: createSaleDto.paymentMethod,
			installments: createSaleDto.installments,
			grossValue: createSaleDto.grossValue,
			netValue: createSaleDto.netValue,
			discount: createSaleDto.discount,
			discountPercent: createSaleDto.discountPercent,
			date: createSaleDto.date,
			hour: createSaleDto.hour,
			transportName: createSaleDto.transportName,
			transportPlate: createSaleDto.transportPlate,
			freightType: createSaleDto.freightType,
			freightValue: createSaleDto.freightValue,
			packageQuantity: createSaleDto.packageQuantity,
			grossWeight: createSaleDto.grossWeight,
			netWeight: createSaleDto.netWeight,
			expenses: createSaleDto.expenses,
			warranty: createSaleDto.warranty,
			entryValue: createSaleDto.entryValue,
			observation: createSaleDto.observation,
			customer,
		})

		const created = await this.saleRepository.save(sale)

		return created
	}

	async findAllSale() {
		return await this.saleRepository.find({ relations: ['customer'] })
	}

	async findOneSale(id: string) {
		const sale = await this.saleRepository.findOne({
			where: { id: id },
			relations: ['customer'],
		})

		if (!sale) {
			return false
		}

		return sale
	}

	async updateSale(id: string, updateSaleDto: UpdateSaleDto) {
		const sale = await this.findOneSale(id)

		if (!sale) {
			return false
		}

		sale.companyName = updateSaleDto.companyName ?? sale.companyName
		sale.companyID = updateSaleDto.companyID ?? sale.companyID
		sale.date = updateSaleDto.date ?? sale.date
		sale.hour = updateSaleDto.hour ?? sale.hour
		sale.seller = updateSaleDto.seller ?? sale.seller
		sale.grossValue = updateSaleDto.grossValue ?? sale.grossValue
		sale.netValue = updateSaleDto.netValue ?? sale.netValue
		sale.installments = updateSaleDto.installments ?? sale.installments
		sale.paymentMethod = updateSaleDto.paymentMethod ?? sale.paymentMethod
		sale.discount = updateSaleDto.discount ?? sale.discount
		sale.discountPercent = updateSaleDto.discountPercent ?? sale.discountPercent
		sale.transportName = updateSaleDto.transportName ?? sale.transportName
		sale.transportPlate = updateSaleDto.transportPlate ?? sale.transportPlate
		sale.freightType = updateSaleDto.freightType ?? sale.freightType
		sale.freightValue = updateSaleDto.freightValue ?? sale.freightValue
		sale.packageQuantity = updateSaleDto.packageQuantity ?? sale.packageQuantity
		sale.grossWeight = updateSaleDto.grossWeight ?? sale.grossWeight
		sale.netWeight = updateSaleDto.netWeight ?? sale.netWeight
		sale.expenses = updateSaleDto.expenses ?? sale.expenses
		sale.warranty = updateSaleDto.warranty ?? sale.warranty
		sale.entryValue = updateSaleDto.entryValue ?? sale.entryValue
		sale.observation = updateSaleDto.observation ?? sale.observation
		sale.sentSale = updateSaleDto.sentSale ?? sale.sentSale

		const updated = await this.saleRepository.save(sale)

		return updated
	}

	async updateConfig(updateConfigDto: UpdateConfigDto) {
		try {
			const updated = await this.allConfigService.updateConfig(this.saleConfigId, updateConfigDto)

			this.taskSaleService.updateSettings(updated.runTime, updated.runAuto)

			return updated
		} catch (err) {
			throw new InternalServerErrorException(`${err}`)
		}
	}

	async findConfigs() {
		const config = await this.allConfigService.findOne(this.saleConfigId)
		return config
	}

	async updateMessage(updateMessageDto: UpdateMessageDto) {
		const message = await this.messagesService.findOne(this.saleMessageId)

		if (!message) {
			this.logger.error(`Mesagem ID:${this.saleConfigId} de envio de venda não encontrada`)
			throw new NotFoundException(`Mesagem ID:${this.saleConfigId} de envio de venda não encontrada`)
		}

		message.message = updateMessageDto.message ?? message.message

		const updated = await this.messagesService.update(this.saleMessageId, message)

		return updated
	}

	async findMessage() {
		const message = await this.messagesService.findOne(this.saleMessageId)
		return message
	}

	async findWelcomeMessage() {
		const message = await this.messagesService.findOne(999)
		return message
	}

	async removeSale(id: string) {
		const sale = await this.findOneSale(id)

		if (!sale) {
			return { success: false, message: `Venda ID: ${id} não encontrada` }
		}

		sale.active = false

		this.saleRepository.save(sale)

		return { success: true, message: `Venda ID: ${id} removida` }
	}
}
