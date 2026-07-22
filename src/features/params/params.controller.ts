import { Controller, Get, Post, Body, HttpException, HttpStatus, Put } from '@nestjs/common';
import { ParamsService } from './params.service';

@Controller('params')
export class ParamsController {
  constructor(private readonly paramsService: ParamsService) {}

  @Post()
  save(@Body() body: any) {
    try {
      this.paramsService.saveConfig(body);
      return { status: 'ok' };
    } catch (err) {
      throw new HttpException(
        { status: 'erro', message: err.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  load() {
    try {
      const configs = this.paramsService.loadConfig();
      return configs;
    } catch (err) {
      throw new HttpException(
        { status: 'erro', message: err.message },
        err.message === 'Config file not found'
          ? HttpStatus.NOT_FOUND
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('version')
  getVersion() {
    try {
      const version = this.paramsService.getVersion();
      return { version };
    } catch (err) {
      throw new HttpException(
        { status: 'erro', message: err.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('version')
  setVersion(@Body() body: { version: string }) {
    try {
      if (!body.version) {
        throw new HttpException(
          { status: 'erro', message: 'Versão não informada' },
          HttpStatus.BAD_REQUEST,
        );
      }
      this.paramsService.setVersion(body.version);
      return { status: 'ok', message: 'Versão atualizada com sucesso' };
    } catch (err) {
      throw new HttpException(
        { status: 'erro', message: err.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('check-update')
  async checkUpdate() {
    try {
      const updateInfo = await this.paramsService.checkUpdate();
      return updateInfo;
    } catch (err) {
      throw new HttpException(
        { status: 'erro', message: err.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
