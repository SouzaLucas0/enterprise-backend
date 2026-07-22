import { Injectable, Logger } from '@nestjs/common';
import { AppMetaService } from '../app-meta/app-meta.service';
import { AllConfigSeed } from './all-config.seed';
import { MessageVariablesSeed } from './message-variables.seed';
import { MessageSeed } from './messages.seed';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly appMetaService: AppMetaService,
    private readonly allConfigSeed: AllConfigSeed,
    private readonly messageSeed: MessageSeed,
    private readonly messageVariablesSeed: MessageVariablesSeed,
  ) {}

  async runIfNeeded(): Promise<void> {
    const executed = await this.appMetaService.get('database_seeded');

    if (executed) {
      this.logger.verbose('Seeds já executadas — pulando');
      return;
    }

    this.logger.verbose('Executando seeds...');
    await this.allConfigSeed.run();
    await this.messageSeed.run();
    await this.messageVariablesSeed.run();

    await this.appMetaService.set('database_seeded', 'true');
    this.logger.verbose('Seeds finalizadas');
  }
}
