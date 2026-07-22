import { Injectable, Logger } from '@nestjs/common'
import { DataSource, Table } from 'typeorm'

@Injectable()
export class DatabaseSetupService {
  private readonly logger = new Logger(DatabaseSetupService.name)

  constructor(private readonly dataSource: DataSource) {}

  async ensureDatabase(): Promise<void> {
    if (!this.dataSource.isInitialized) {
      await this.dataSource.initialize()
    }

    const queryRunner = this.dataSource.createQueryRunner()

    try {
      const hasMigrationsTable = await queryRunner.hasTable('migrations')
      if (!hasMigrationsTable) {
        this.logger.verbose('Criando tabela migrations...')
        await queryRunner.createTable(
          new Table({
            name: 'migrations',
            columns: [
              {
                name: 'id',
                type: 'serial',
                isPrimary: true,
              },
              {
                name: 'timestamp',
                type: 'bigint',
              },
              {
                name: 'name',
                type: 'varchar',
              },
            ],
          }),
        )
      }

      const hasLegacySchema =
        (await queryRunner.hasTable('app_meta')) || (await queryRunner.hasTable('customer'))

      if (hasLegacySchema) {
        const executedMigrations = await queryRunner.query(`SELECT "name" FROM "migrations"`)
        if (executedMigrations.length === 0) {
          let inserted = 0
          for (const migration of this.dataSource.migrations) {
            const name = migration.name || (migration.constructor as any).name
            const match = name.match(/(\d+)$/)
            const timestamp = match ? match[1] : '0'
            await queryRunner.query(
              `INSERT INTO "migrations" ("timestamp", "name") VALUES ($1, $2)`,
              [timestamp, name],
            )
            inserted += 1
          }

          if (inserted > 0) {
            this.logger.verbose(
              `Banco existente detectado — ${inserted} migration(s) marcada(s) como já executada(s)`,
            )
          }
        }
      }
    } finally {
      await queryRunner.release()
    }

    this.logger.verbose('Executando migrations pendentes...')
    try {
      const result = await this.dataSource.runMigrations()
      if (result && result.length > 0) {
        this.logger.log(`✓ ${result.length} migration(s) executada(s):`)
        result.forEach((m: any) => this.logger.log(`  - ${m.name}`))
      } else {
        this.logger.verbose('Nenhuma migration pendente')
      }
    } catch (error) {
      this.logger.error('Erro ao executar migrations:', error)
      throw error
    }
    this.logger.verbose('Migrations finalizadas')
  }
}
