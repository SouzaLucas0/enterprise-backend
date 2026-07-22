import { Injectable, Logger } from '@nestjs/common';
import * as Firebird from 'node-firebird';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  healthCheck(): { status: string } {
    this.logger.debug('API check requested');
    return { status: 'UP' };
  }

  async testConnection(
    host: string,
    port: number,
    database: string,
    user: string,
    password: string,
  ) {
    const options: Firebird.Options = {
      host,
      port,
      database,
      user,
      password,
      lowercase_keys: false,
      pageSize: 4096,
    };

    return new Promise((resolve) => {
      this.logger.debug('Firebird check requested');
      Firebird.attach(options, (err, db) => {
        if (err) {          
          return resolve({
            success: false,
            message: 'Erro ao conectar-se ao firebird: ' + err.message,
          });
        }

        db.detach(() => {
          resolve({
            success: true,
            message: 'Conexão Firebird estabelecida com sucesso!',
          });
        });
      });
    });
  }
}
