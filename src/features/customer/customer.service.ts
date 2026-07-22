import { BadGatewayException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CreateCustomerDto } from './dto/create-customer.dto'
import { UpdateCustomerDto } from './dto/update-customer.dto'
import { Customer } from './entities/customer.entity'

@Injectable()
export class CustomerService {
	private readonly logger = new Logger(CustomerService.name)

	constructor(
		@InjectRepository(Customer)
		private readonly customersRepository: Repository<Customer>,
	) {}

	async createCustomer(createCustomerDto: CreateCustomerDto) {
		if (!createCustomerDto) {
			this.logger.error('Dados do cliente não enviados')
			throw new BadGatewayException('Dados do cliente não enviados')
		}

		const customer = this.customersRepository.create({
			id: createCustomerDto.id,
			name: createCustomerDto.name,
			contact: createCustomerDto.contact,
			bithday: createCustomerDto.bithday ? createCustomerDto.bithday : undefined,
			lastPurchaseDate: createCustomerDto.lastPurchaseDate,
			lastPurchaseValue: createCustomerDto.lastPurchaseValue,
			company: createCustomerDto.company,
		})

		const created = await this.customersRepository.save(customer)

		this.logger.log(`Cliente ${created.name} adicionado`)

		return created
	}

	async findAllCustomers() {
		return await this.customersRepository.find()
	}

	async findBirthdayCustomers() {
		const today = new Date()
		const day = today.getDate()
		const month = today.getMonth() + 1

		return await this.customersRepository
			.createQueryBuilder('customer')
			.where('customer.bithday IS NOT NULL')
			.andWhere('customer.active IS NOT NULL')
			.andWhere('EXTRACT(DAY FROM customer.bithday) = :day', { day })
			.andWhere('EXTRACT(MONTH FROM customer.bithday) = :month', { month })
			.andWhere('customer.bithdaySentDate IS NULL')
			.getMany()
	}

	async findOneCustomer(id: string) {
		if (!id) {
			this.logger.error(`ID: do cliente não enviado`)
			return null
		}

		const customer = await this.customersRepository.findOne({ where: { id } })

		if (!customer) {
			return null
		}

		return customer
	}

	async updateCustomer(id: string, updateCustomerDto: UpdateCustomerDto) {
		if (!id && !updateCustomerDto) {
			this.logger.error('Dados do cliente não enviados')
			throw new BadGatewayException('Dados do cliente não enviados')
		}

		const customer = await this.customersRepository.findOneByOrFail({ id })

		if (!customer) {
			this.logger.error(`Cliente ID: ${id} não encontrado`)
			throw new NotFoundException(`Cliente ID: ${id} não encontrado`)
		}
		
		customer.bithdaySentDate = updateCustomerDto.bithdaySentDate ?? customer.bithdaySentDate
		customer.active = updateCustomerDto.active ?? customer.active
		customer.name = updateCustomerDto.name ?? customer.name
		customer.contact = updateCustomerDto.contact ?? customer.contact
		customer.bithday = updateCustomerDto.bithday ?? customer.bithday
		customer.lastPurchaseDate = updateCustomerDto.lastPurchaseDate ?? customer.lastPurchaseDate
		customer.lastPurchaseValue = updateCustomerDto.lastPurchaseValue ?? customer.lastPurchaseValue
		customer.company = updateCustomerDto.company ?? customer.company
		customer.sendBithday = updateCustomerDto.sendBithday ?? customer.sendBithday
		customer.sendCharge = updateCustomerDto.sendCharge ?? customer.sendCharge
		customer.sendBankSlip = updateCustomerDto.sendBankSlip ?? customer.sendBankSlip
		customer.sendNfe = updateCustomerDto.sendNfe ?? customer.sendNfe
		customer.sendSale = updateCustomerDto.sendSale ?? customer.sendSale
		customer.sendOS = updateCustomerDto.sendOS ?? customer.sendOS
		customer.firstMessageSent = updateCustomerDto.firstMessageSent ?? customer.firstMessageSent


		await this.customersRepository.save(customer)

		return customer
	}

	async disableCustomer(id: string) {
		if (!id) {
			this.logger.error('Dados do cliente não enviados')
			throw new BadGatewayException('Dados do cliente não enviados')
		}

		const disabled = await this.customersRepository.findOneByOrFail({ id })

		if (!disabled) {
			this.logger.error(`Cliente ID: ${id} não encontrado`)
			throw new NotFoundException(`Cliente ID: ${id} não encontrado`)
		}

		disabled.active = false
		await this.customersRepository.save(disabled)
	}

	async findByPhoneNumber(phoneNumber: string): Promise<Customer[]> {
		if (!phoneNumber) {
			this.logger.error('Número de telefone não enviado')
			throw new BadGatewayException('Número de telefone não enviado')
		}

		const cleanPhoneNumber = phoneNumber.replace(/^55/, '')

		return await this.customersRepository.find({ where: { contact: cleanPhoneNumber } })
	}
}
