import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AllConfigSeed } from '../seeds/all-config.seed';
import { AllConfigService } from './all-config.service';
import { AllConfig } from './entities/config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AllConfig])],
  providers: [AllConfigService, AllConfigSeed],
  exports: [AllConfigService],
})
export class AllConfigModule {}
