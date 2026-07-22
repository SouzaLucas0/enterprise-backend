import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { DatabaseSetupService } from './core/database/database-setup.service'
import { SeedService } from './core/seeds/seed.service'
import { validateKey } from './shared/utils/validateKey'

async function bootstrap() {
	const app = await NestFactory.create(AppModule)

	const shutdown = async (signal: string) => {
		console.log(`Encerrando serviço (${signal})...`)
		try {
			await app.close()
		} finally {
			process.exit(0)
		}
	}

	process.on('SIGTERM', shutdown)
	process.on('SIGINT', shutdown)
	process.on('SIGBREAK', shutdown)

	if (!(await validateKey())) {
		setTimeout(() => process.exit(1), 3000)
		return
	}

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			transform: true,
		}),
	)

	const config = new DocumentBuilder().setTitle('CECONECCT API').setVersion('1.0.0').build()

	const document = SwaggerModule.createDocument(app, config)
	SwaggerModule.setup('docs', app, document)

	app.enableCors({ origin: '*' })

	try {
		const dbSetup = app.get(DatabaseSetupService)
		await dbSetup.ensureDatabase()

		const seedService = app.get(SeedService)
		await seedService.runIfNeeded()
	} catch (err) {
		console.error('Erro ao preparar banco de dados:', err)
		process.exit(1)
	}

	await app.listen(4000)
}
bootstrap()
