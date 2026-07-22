import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as ini from 'ini';
import * as path from 'path';

@Injectable()
export class ParamsService {
  private readonly logger = new Logger(ParamsService.name);
  private readonly configPath = path.join(process.cwd(), 'params.ini');
  private readonly metadataUrl = process.env.METADATAURL

  saveConfig(configs: any): void {
    let existingConfig = {};
    try {
      existingConfig = this.loadConfig();
    } catch (error) {
      this.logger.warn('Arquivo params.ini não encontrado, criando novo');
    }

    const mergedConfig = { ...existingConfig, ...configs };
    
    const iniString = ini.stringify(mergedConfig);
    fs.writeFileSync(this.configPath, iniString, 'utf-8');
    this.logger.log(`Parametros salvos ${JSON.stringify(configs)}`);
  }

  loadConfig(): any {
    if (!fs.existsSync(this.configPath)) {
      throw new Error('Config file not found');
    }

    const iniString = fs.readFileSync(this.configPath, 'utf-8');
    return ini.parse(iniString);
  }

  getVersion(): string {
    try {
      const config = this.loadConfig();
      return config.version || '1.0.0';
    } catch (error) {
      this.logger.error('Erro ao obter versão', error);
      return '1.0.0';
    }
  }

  setVersion(version: string): void {
    try {
      this.saveConfig({ version });
      this.logger.log(`Versão atualizada para ${version}`);
    } catch (error) {
      this.logger.error('Erro ao atualizar versão', error);
      throw error;
    }
  }

  async checkUpdate(): Promise<{
    currentVersion: string;
    remoteVersion: string;
    updateAvailable: boolean;
    downloadUrl?: string;
    releaseDate?: string;
    changelog?: string;
  }> {
    try {
      const currentVersion = this.getVersion();
      
      const response = await fetch(this.metadataUrl);
      if (!response.ok) {
        throw new Error(`Falha ao buscar metadata: ${response.status}`);
      }
      
      const metadata = await response.json();
      const remoteVersion = metadata.version;
      
      const updateAvailable = this.compareVersions(remoteVersion, currentVersion) > 0;
      
      return {
        currentVersion,
        remoteVersion,
        updateAvailable,
        downloadUrl: metadata.downloadUrl,
        releaseDate: metadata.releaseDate,
        changelog: metadata.changelog,
      };
    } catch (error) {
      this.logger.error('Erro ao verificar atualização', error);
      throw error;
    }
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }
    
    return 0;
  }
}
