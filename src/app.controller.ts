import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealthCheck(): { status: string } {
    return this.appService.healthCheck();
  }

  @Get('firebird')
  async test(
    @Query('host') host: string,
    @Query('port') port: string,
    @Query('database') database: string,
    @Query('user') user: string,
    @Query('password') password: string,
  ) {
    return await this.appService.testConnection(
      host,
      Number(port),
      database,
      user,
      password,
    );
  }
}
