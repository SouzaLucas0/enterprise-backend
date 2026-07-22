import { Module } from '@nestjs/common';
import { FirebirdService } from './firebird.service';

@Module({
  providers: [FirebirdService],
  exports: [FirebirdService],
})
export class FirebirdModule {}
