import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	Logger,
	NotFoundException,
	OnModuleInit,
} from '@nestjs/common'
import * as fs from 'fs'
import * as ini from 'ini'
import * as path from 'path'
import { WhatsappInstanceResponsetype, WhatsappInstanceType } from '../../@types/instanceType'
import { CreateWhatsappInstanceDto } from './dto/create-whatsapp-instance.dto'
import { SendMediaDto } from './dto/send-media.dto'
import { SendMessageDto, SendMessageResponseDto } from './dto/send-message.dto'
import { WhatsappInstanceService } from './whatsapp-instance.service'


@Injectable()
export class WhatsappService implements OnModuleInit {
	private readonly logger = new Logger(WhatsappService.name)
	private readonly idUazapiCredentials = process.env.IDUAZAPICREDENTIALS
	private readonly validatorUrl = process.env.VALIDATORURL
	private uazapiBaseUrl: string
	private uazapiAadminToken: string
	private apiKey: string
	private organizationName: string

	constructor(private whatsappInstanceService: WhatsappInstanceService) {
		try {
			const filePath = path.resolve(process.cwd(), 'params.ini')
			if (fs.existsSync(filePath)) {
				const params = ini.parse(fs.readFileSync(filePath, 'utf-8'))
				this.apiKey = params.apiKey || ''
			} else {
				this.logger.warn('Arquivo params.ini não encontrado')
				this.apiKey = ''
			}
		} catch (error) {
			this.logger.error('Erro ao ler params.ini para apiKey', error)
			this.apiKey = ''
		}
	}

	async onModuleInit() {
		const uazapiCredentials = await this.getUazapiCredentials(this.validatorUrl, this.idUazapiCredentials)
		const organizationName = await this.getOrganizationName(this.validatorUrl, this.apiKey)

		if (!uazapiCredentials || !organizationName) {
			this.logger.error('Não foi possível obter credenciais UAZAPI, verifique o serviço de validação')
			throw new InternalServerErrorException('Falha ao obter credenciais UAZAPI')
		}

		this.uazapiBaseUrl = uazapiCredentials.url
		this.uazapiAadminToken = uazapiCredentials.token
		this.organizationName = organizationName.client
	}

	async createInstance(createWhatsappInstanceDto: CreateWhatsappInstanceDto): Promise<WhatsappInstanceType> {
		if (!createWhatsappInstanceDto) {
			this.logger.error('Dados de criação de instância não fornecidos')
			throw new BadRequestException('Dados de criação de instância são obrigatórios')
		}

		try {
			const instanceExists = await this.whatsappInstanceService.findOne(createWhatsappInstanceDto.clientId)

			if (instanceExists) {
				throw new Error(`Instância ${createWhatsappInstanceDto.clientId} já existe. Tente outro nome`)
			}

			const response = await fetch(`${this.uazapiBaseUrl}/instance/init`, {
				method: 'POST',
				headers: {
					'Content-type': 'application/json',
					'Accept': 'application/json',
					'admintoken': this.uazapiAadminToken,
				},
				body: JSON.stringify({
					name: createWhatsappInstanceDto.clientId,
					systemName: this.organizationName,
					fingerprintProfile: 'chrome',
					browser: 'chrome',
				}),
			})

			const data = await response.json()

			if (!response.ok) {
				throw new InternalServerErrorException(`Erro ao criar instância: ${data.error || response.statusText}`)
			}

			const instance: WhatsappInstanceType = {
				clientId: data.name,
				token: data.token,
				status: data.status,
				name: data.name,
			}

			const createdInstence = await this.whatsappInstanceService.create(instance)

			const connectionInstance = await this.connectInstance(createdInstence.name, createdInstence.token)

			instance.qrcode = connectionInstance.qrcode		
			
			this.logger.log(`Instância ${instance.clientId} criada com sucesso`)

			return instance
		} catch (err: any) {
			this.logger.error(`Falha ao criar instância: ${err || 'Erro desconhecido'}`)
			throw new InternalServerErrorException(`${err || 'Erro desconhecido'}`)
		}
	}

	async connectInstance(clientId: string, instanceToken: string): Promise<{ status: string; qrcode?: string }> {
		try {
			const response = await fetch(`${this.uazapiBaseUrl}/instance/connect`, {
				method: 'POST',
				headers: {
					'Content-type': 'application/json',
					Accept: 'application/json',
					token: instanceToken,
				},
			})

			const data = await response.json()

			if (!response.ok) {
				throw new InternalServerErrorException(
					`Falha ao conectar instância: ${data.error || response.statusText}`,
				)
			}

			this.whatsappInstanceService.update(clientId, { status: data.instance.status })

			return { status: data.instance.status, qrcode: data.instance.qrcode }
		} catch (err) {
			this.logger.error(`${err || 'Erro desconhecido'}`)
			throw err
		}
	}

	async getInstanceStatus(clientId: string): Promise<WhatsappInstanceResponsetype> {
		const instance = await this.whatsappInstanceService.findOne(clientId)

		if (!instance) {
			throw new NotFoundException(`Instância ${clientId} não encontrada`)
		}

		try {
			const response = await fetch(`${this.uazapiBaseUrl}/instance/status`, {
				method: 'GET',
				headers: {
					'Content-type': 'application/json',
					'Accept': 'application/json',
					'token': instance.token,
				},
			})

			const data = await response.json()

			if (!response.ok) {
				throw new InternalServerErrorException(`Falha ao obter status da instância: ${data.error || response.statusText}`)
			}

			return {
				name: data.instance.name,
				status: data.instance.status,
				systemName: data.instance.systemName,
				owner: data.instance.owner,
			}
		} catch (err) {
			this.logger.error(`${err || 'Erro desconhecido'}`)
			throw err
		}
	}

	async getQrCode(clientId: string): Promise<{ qrcode: string }> {
		const instance = await this.whatsappInstanceService.findOne(clientId)
		let qrcode = ''
		
		if (!instance) {
			throw new NotFoundException(`Instância ${clientId} não encontrada`)
		}

		try {
			const response = await fetch(`${this.uazapiBaseUrl}/instance/status`, {
				method: 'GET',
				headers: {
					'Content-type': 'application/json',
					Accept: 'application/json',
					token: instance.token,
				},
			})

			const data = await response.json()

			if (!response.ok) {
				throw new InternalServerErrorException(`Falha ao obter QR code: ${data.error || response.statusText}`)
			}

			if (data.instance.status === 'connected') {
				throw new BadRequestException(`Instância ${clientId} já está conectada`)
			}

			if (data.instance.qrcode === '') {				
				const reconnect = await this.connectInstance(clientId, instance.token)
				

				if (!reconnect.qrcode || reconnect.qrcode === '') {
					throw new InternalServerErrorException(`Não foi possível obter QR code para: ${clientId}`)
				}

				qrcode = reconnect.qrcode

				return { qrcode }
			}

			qrcode = data.instance.qrcode

			return { qrcode }
		} catch (err) {
			this.logger.error(`${err || 'Erro desconhecido'}`)
			throw err
		}
	}

	async getAllInstances(): Promise<WhatsappInstanceResponsetype[]> {
		try {
			const response = await fetch(`${this.uazapiBaseUrl}/instance/all`, {
				method: 'GET',
				headers: {
					'Content-type': 'application/json',
					Accept: 'application/json',
					admintoken: this.uazapiAadminToken,
				},
			})

			if (!response.ok) {
				const dataError = await response.json()
				throw new InternalServerErrorException(
					`Falha ao obter todas as instâncias: ${dataError.error || response.statusText}`,
				)
			}

			const data: WhatsappInstanceResponsetype[] = await response.json()

			const instancesDb = await this.whatsappInstanceService.findAll()
			const instancesApi = data.filter((instance) => instance.systemName === this.organizationName)

			const apiInstanceNames = new Set(instancesApi.map((instance) => instance.name))

			await Promise.all(
				instancesDb.map(async (instanceDb) => {
					if (!apiInstanceNames.has(instanceDb.clientId)) {
						await this.whatsappInstanceService.hardDelete(instanceDb.clientId)
						this.logger.warn(`Instância ${instanceDb.clientId} removida do banco de dados por não existir na API`)
						return
					}
				})
			)

			if (instancesApi.length === 0) {
				this.logger.warn('Nenhuma instância encontrada')

				instancesDb.map(async (instance) => {
					await this.whatsappInstanceService.hardDelete(instance.clientId)
				})

				return []
			}

			const intances = instancesApi.map((instance) => ({
				name: instance.name,
				status: instance.status,
				systemName: instance.systemName,
				owner: instance.owner,
			}))

			return intances
		} catch (err: any) {
			this.logger.error(`Erro ao obter todas as instâncias: ${err || 'Erro desconhecido'}`)
			throw new InternalServerErrorException(`Falha ao obter todas as instâncias: ${err || 'Erro desconhecido'}`)
		}
	}

	async deleteInstance(clientId: string): Promise<void> {
		const instance = await this.whatsappInstanceService.findOne(clientId)

		if (!instance) {
			throw new NotFoundException(`Instância ${clientId} não encontrada`)
		}
		
		try {
			const response = await fetch(`${this.uazapiBaseUrl}/instance`, {
				method: 'DELETE',
				headers: {
					'Content-type': 'application/json',
					Accept: 'application/json',
					token: instance.token,
				},
			})
			
			if (!response.ok) {
				const dataError = await response.json()
				throw new InternalServerErrorException(
					`Falha ao deletar instância: ${dataError.error || response.statusText}`,
				)
			}
			
			await this.whatsappInstanceService.hardDelete(clientId)
			this.logger.log(`Instância ${clientId} deletada com sucesso`)
			return
		} catch (err) {
			this.logger.error(`${err || 'Erro desconhecido'}`)
			throw err
		}
	}

	async sendMessage(sendMessageDto: SendMessageDto): Promise<SendMessageResponseDto> {
		if (!sendMessageDto) {
			throw new BadRequestException('Dados de envio de mensagem são obrigatórios')
		}

		const instance = await this.whatsappInstanceService.findOne(sendMessageDto.clientId)

		if (!instance) {
			throw new NotFoundException(`Instância ${sendMessageDto.clientId} não encontrada`)
		}		

		try {
			const response = await fetch(`${this.uazapiBaseUrl}/send/text`, {
				method: 'POST',
				headers: {
					'Content-type': 'application/json',
					Accept: 'application/json',
					token: instance.token,
				},
				body: JSON.stringify({
					number: sendMessageDto.number,
					text: sendMessageDto.message,
				}),
			})

			const data = await response.json()

			if (!response.ok) {
				return { error: `Falha ao enviar mensagem: ${data.error || response.statusText}` }
			}

			return { success: 'Mensagem enviada com sucesso!' }
		} catch (err) {
			this.logger.error(`${err || 'Erro desconhecido'}`)
			throw err
		}
	}

	async sendMedia(sendMediaDto: SendMediaDto): Promise<SendMessageResponseDto> {
		if (!sendMediaDto) {
			throw new BadRequestException('Dados de envio de mídia são obrigatórios')
		}

		const instance = await this.whatsappInstanceService.findOne(sendMediaDto.clientId)

		if (!instance) {
			throw new NotFoundException(`Instância ${sendMediaDto.clientId} não encontrada`)
		}

		try {
			const filePath = sendMediaDto.filePath
			const fileBuffer = fs.readFileSync(filePath)
			const base64File = fileBuffer.toString('base64')

			const response = await fetch(`${this.uazapiBaseUrl}/send/media`, {
				method: 'POST',
				headers: {
					'Content-type': 'application/json',
					Accept: 'application/json',
					token: instance.token,
				},
				body: JSON.stringify({
					number: sendMediaDto.number,
					text: sendMediaDto.caption,
					type: sendMediaDto.type,
					file: base64File,
					docName: sendMediaDto.docName,
				}),
			})

			const data = await response.json()

			if (!response.ok) {
				return { error: `Falha ao enviar arquivo: ${data.error || response.statusText}` }
			}

			return { success: 'Arquivo enviado com sucesso!' }
		} catch (err) {
			this.logger.error(`${err || 'Erro desconhecido'}`)
			throw err
		}
	}

	async getUazapiCredentials(
		validatorUrl: string,
		idCredential: string,
	): Promise<{ url: string; token: string } | undefined> {
		try {
			const response = await fetch(`${validatorUrl}/credentials/${idCredential}`, {
				method: 'GET',
				headers: { 'Content-type': 'application/json' },
			})

			if (!response.ok) {
				throw new Error(`Erro ao obter credenciais: ${response.status}`)
			}

			const data = await response.json()

			return { url: data.url, token: data.token }
		} catch (err: any) {
			this.logger.error(`Erro ao obter credenciais UAZAPI: ${err.message || 'Erro desconhecido'}`)
		}
	}

	async getOrganizationName(validatorUrl: string, apiKey: string): Promise<{ client: string } | undefined> {
		try {
			const response = await fetch(`${validatorUrl}/validator/${apiKey}`, {
				method: 'GET',
				headers: { 'Content-type': 'application/json' },
			})

			if (!response.ok) {
				throw new Error(`Erro ao obter nome da organização: ${response.status}`)
			}

			const data = await response.json()

			return data
		} catch (err: any) {
			this.logger.error(`Erro ao obter nome da organização: ${err.message || 'Erro desconhecido'}`)
		}
	}
}
