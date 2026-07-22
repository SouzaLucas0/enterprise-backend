import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppMeta } from './app-meta.entity'
import { AppMetaService } from './app-meta.service'

@Module({
	imports: [TypeOrmModule.forFeature([AppMeta])],
	providers: [AppMetaService],
	exports: [AppMetaService],
})
export class AppMetaModule {}
