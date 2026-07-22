import { MigrationInterface, QueryRunner } from 'typeorm'

export class InsertDefaultMessage1740998600000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		// Insert default message
		await queryRunner.query(
			`INSERT INTO "message" (id, message) VALUES (999, 'Olá {{nomeCliente}}, somos da {{nomeEmpresa}}. Este é nosso canal de comunicação. Caso deseje não receber mais mensagens, responda com "PARAR MENSAGENS".') ON CONFLICT (id) DO NOTHING`,
		)

		// Insert welcome message variables
		const exists = await queryRunner.query(
			`SELECT * FROM "message_variable" WHERE function = $1`,
			['welcome'],
		)

		if (exists.length === 0) {
			await queryRunner.query(
				`INSERT INTO "message_variable" (variables, function) VALUES ($1, $2)`,
				['{{nomeEmpresa}},{{nomeCliente}}', 'welcome'],
			)
		}
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DELETE FROM "message" WHERE id = 999`)
		await queryRunner.query(`DELETE FROM "message_variable" WHERE function = $1`, ['welcome'])
	}
}
