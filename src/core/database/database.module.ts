import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import * as fs from 'fs'
import * as ini from 'ini'
import * as path from 'path'
import { InitialSchema1740998400000 } from '../../migrations/1740998400000-InitialSchema'
import { AddFirstMessageSentToCustomer1740998500000 } from '../../migrations/1740998500000-AddFirstMessageSentToCustomer'
import { InsertDefaultMessage1740998600000 } from '../../migrations/1740998600000-InsertDefaultMessage'
import { DatabaseSetupService } from './database-setup.service'
import { InsertChargeRoleReminder1740998700000 } from '../../migrations/1740998700000-InsertChargeRoleReminder'
import { CreateOrUpdateWorkOrderSituation1775583315579 } from '../../migrations/1775583315579-CreateOrUpdateWorkOrderSituation'

const paramsPath = path.resolve(process.cwd(), 'params.ini')
const params = ini.parse(fs.readFileSync(paramsPath, 'utf-8'))

@Module({
	imports: [
		TypeOrmModule.forRoot({
			type: 'postgres',
			host: 'localhost',
			port: 5432,
			username: params.pgUser,
			password: params.pgPassword,
			database: 'enterprise_db',
			entities: [__dirname + '/../**/*.entity{.ts,.js}'],
			autoLoadEntities: true,
			synchronize: false,
			migrations: [
				InitialSchema1740998400000,
				AddFirstMessageSentToCustomer1740998500000,
				InsertDefaultMessage1740998600000,
				InsertChargeRoleReminder1740998700000,
				CreateOrUpdateWorkOrderSituation1775583315579
			],
			logging: ['migration', 'error', 'warn'],
		}),
	],
	providers: [DatabaseSetupService],
	exports: [DatabaseSetupService],
})
export class DatabaseModule {}
