import { forwardRef, Inject, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { AllConfigService } from '../../core/config/all-config.service'
import { UpdateConfigDto } from '../../core/config/dto/update-config.dto'
import { TaskBankSlipService } from '../../jobs/bankSlip/bankSlip-task.service'
import { TaskNfeService } from '../../jobs/nfe/nfe-task.service'
import { Repository } from 'typeorm'
import { CustomerService } from '../customer/customer.service'
import { UpdateMessageDto } from '../messages/dto/update-message.dto'
import { MessagesService } from '../messages/messages.service'
import { CreatePdfDto } from './dto/create-pdf.dto'
import { UpdatePdfDto } from './dto/update-pdf.dto'
import { Pdf } from './entities/pdf.entity'

@Injectable()
export class PdfService {
	private readonly logger = new Logger(`Gerenciamento de PDFs`)
	private readonly nfeMessageId = 2
	private readonly nfeConfigId = 4
	private readonly bankSlipConfigId = 3
	private readonly bankSlipMessageId = 3

	constructor(
		@InjectRepository(Pdf)
		private readonly pdfRepository: Repository<Pdf>,
		private readonly allConfigService: AllConfigService,
		@Inject(forwardRef(() => TaskBankSlipService))
		private readonly taskBankSlipService: TaskBankSlipService,
		@Inject(forwardRef(() => TaskNfeService))
		private readonly taskNfeService: TaskNfeService,
		private readonly customerService: CustomerService,
		private readonly messagesService: MessagesService,
	) {}

	async findConfigs(id: number) {
		const config = await this.allConfigService.findOne(id)
		return config
	}

	async updateConfigBankSlip(updateConfigDto: UpdateConfigDto) {
		try {
			const updated = await this.allConfigService.updateConfig(this.bankSlipConfigId, updateConfigDto)

			this.taskBankSlipService.updateSettings(updated.runTime, updated.runAuto)

			return updated
		} catch (err) {
			throw new InternalServerErrorException(`${err}`)
		}
	}

	async updateConfigNfe(updateConfigDto: UpdateConfigDto) {
		try {
			const updated = await this.allConfigService.updateConfig(this.nfeConfigId, updateConfigDto)

			this.taskNfeService.updateSettings(updated.runTime, updated.runAuto)

			return updated
		} catch (err) {
			throw new InternalServerErrorException(`${err}`)
		}
	}

	async createPdf(createPdfDto: CreatePdfDto) {
		const customer = await this.customerService.findOneCustomer(createPdfDto.customerId)

		if (!customer) {
			this.logger.error(`Cliente ID: ${createPdfDto.customerId} não encontrado`)
			return false
		}

		if (!customer.active) {
			this.logger.warn(`Ciente ${customer.name} inativo`)
			return false
		}

		if (!createPdfDto) {
			this.logger.error(`Dados do boleto não enviados`)
			return false
		}

		const pdf = this.pdfRepository.create({
			id: createPdfDto.id,
			ourNumber: createPdfDto.ourNumber,
			sentBankSlip: createPdfDto.sentBankSlip,
			sentNfe: createPdfDto.sentNfe,
			customer,
		})

		const created = await this.pdfRepository.save(pdf)

		return created
	}

	async findAllBanckSlip() {
		const pdfs = await this.pdfRepository.find()
		return pdfs.filter((bankSlip) => bankSlip.sentBankSlip !== false || bankSlip.active !== false)
	}

	async findNfeMessage() {
		const message = await this.messagesService.findOne(this.nfeMessageId)
		return message
	}

	async updateNfeMessage(updateMessageDto: UpdateMessageDto) {
		const message = await this.messagesService.findOne(this.nfeMessageId)

		if (!message) {
			this.logger.error(`Mesagem ID:${this.nfeMessageId} de envio de NFe não encontrada`)
			throw new NotFoundException(`Mesagem ID:${this.nfeMessageId} de envio de NFe não encontrada`)
		}

		message.message = updateMessageDto.message ?? message.message

		const updated = await this.messagesService.update(this.nfeMessageId, message)

		return updated
	}

	async updateBankSlipMessage(updateMessageDto: UpdateMessageDto) {
		const message = await this.messagesService.findOne(this.bankSlipMessageId)

		if (!message) {
			this.logger.error(`Mesagem ID:${this.bankSlipMessageId} de envio de boleto não encontrada`)
			throw new NotFoundException(`Mesagem ID:${this.bankSlipMessageId} de envio de boleto não encontrada`)
		}

		message.message = updateMessageDto.message ?? message.message

		const updated = await this.messagesService.update(this.bankSlipMessageId, message)

		return updated
	}

	async findBankSlipMessage() {
		const message = await this.messagesService.findOne(this.bankSlipMessageId)
		return message
	}

	async findAllNfe() {
		const pdfs = await this.pdfRepository.find({
			relations: ['customer'],
		})
		return pdfs.filter((nfe) => nfe.sentNfe !== false || nfe.active !== false)
	}

	async findOnePdf(id: string) {
		if (!id) {
			return false
		}

		const pdf = await this.pdfRepository.findOne({
			where: { id: id },
			relations: ['customer'],
		})

		if (!pdf) {
			return false
		}

		return pdf
	}

	async updatePdf(id: string, updatePdfDto: UpdatePdfDto) {
		if (!id) {
			this.logger.error(`ID do PDF não enviado`)
			throw new NotFoundException(`ID do PDF não enviado`)
		}

		const pdf = await this.findOnePdf(id)

		if (!pdf) {
			this.logger.error(`PDF ID: ${id} não encontrado`)
			throw new NotFoundException(`PDF ID: ${id} não encontrado`)
		}

		pdf.ourNumber = updatePdfDto.ourNumber ?? pdf.ourNumber
		pdf.nfeNumber = updatePdfDto.nfeNumber ?? pdf.nfeNumber
		pdf.sentBankSlip = updatePdfDto.sentBankSlip ?? pdf.sentBankSlip
		pdf.sentNfe = updatePdfDto.sentNfe ?? pdf.sentNfe
		pdf.active = updatePdfDto.active ?? pdf.active

		const created = await this.pdfRepository.save(pdf)

		return created
	}

	async removePdf(id: string) {
		if (!id) {
			this.logger.error(`ID do PDF não enviado`)
			throw new NotFoundException(`ID do PDF não enviado`)
		}

		const pdf = await this.findOnePdf(id)

		if (!pdf) {
			this.logger.error(`PDF ID: ${id} não encontrado`)
			throw new NotFoundException(`PDF ID: ${id} não encontrado`)
		}

		pdf.active = false

		await this.pdfRepository.save(pdf)

		return { succes: true, message: `PDF ID: ${id} removido com sucesso` }
	}

	async findWelcomeMessage() {
		const message = await this.messagesService.findOne(999)
		return message
	}
}
