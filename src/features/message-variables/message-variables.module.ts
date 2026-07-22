import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MessageVariablesSeed } from '../../core/seeds/message-variables.seed'
import { MessageVariable } from './entities/message-variable.entity'
import { MessageVariablesService } from './message-variables.service'

@Module({
	imports: [TypeOrmModule.forFeature([MessageVariable])],
	providers: [MessageVariablesService, MessageVariablesSeed],
	exports: [MessageVariablesService],
})
export class MessageVariablesModule {}
