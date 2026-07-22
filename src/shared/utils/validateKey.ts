import { Logger } from '@nestjs/common'
import * as fs from 'fs'
import * as ini from 'ini'
import * as path from 'path'

const logger = new Logger('License')

export async function validateKey(): Promise<boolean> {
	const result = await Promise.race([resolveLicense(), delay(5 * 60 * 1000)])

	switch (result) {
		case 'timeout':
			const delayRetry = 10 * 60 * 1000
			logger.error(`A API de validação de licença não está respondendo. Tentando novamente em ${delayRetry / 60000} minutos...`)
			await delay(delayRetry)
			return validateKey()
		case 'invalidKey':
			logger.error(`Chave da licença inválida`)
			return false
		case 'validKey':
			return true
		default:
			logger.error('Erro desconhecido ao validar a licença')
			return false
	}
}

async function resolveLicense(): Promise<string> {
	const params = ini.parse(fs.readFileSync(path.resolve(process.cwd(), 'params.ini'), 'utf-8'))
	const apiKey = params.apiKey
	const validatePath = process.env.URLVALIDATOR

	try {
		logger.debug('Validando chave da licença...')

		const response = await fetch(`${validatePath}/${apiKey}`, {
			method: 'GET',
			headers: { 'Content-Type': 'application/json' },
		})

		const data = await response.json()

		if (!response.ok) {
			return 'invalidKey'
		}
		logger.debug(`Licença para ${data.client} válida`)

		return 'validKey'
	} catch (err) {
		logger.error('Erro ao validar a licença:', err)
		return 'timeout'
	}
}

function delay(ms: number): Promise<string> {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve('timeout')
		}, ms)
	})
}
