import { MigrationInterface, QueryRunner } from 'typeorm'

export class InsertChargeRoleReminder1740998700000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		// Insert message for charge role
		await queryRunner.query(
			`INSERT INTO "message" (id, message) VALUES (1000, $1) ON CONFLICT (id) DO NOTHING`,
			[
				`Olá, {{nomeCliente}}! Tudo bem?

Aqui é da {{nomeEmpresa}}. Passando para te lembrar que o(a) {{tipoDocumento}} nº {{numeroDocumento}}, referente à parcela {{parcela}} de {{qtdParcelas}}, vence hoje ({{vencimento}}).

Se já realizou o pagamento, pode desconsiderar esta mensagem. Caso precise de alguma informação ou apoio, estamos à disposição 😊

Obrigado!
{{nomeEmpresa}}`,
			],
		)

		// Insert charge role
		await queryRunner.query(
			`INSERT INTO "charge_role" (id, description, "qtdDaysLate", "sendBol", active, "autoSend", "fk_message") VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
			[999, 'Lembrete de vencimento', 0, true, false, false, 1000],
		)
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DELETE FROM "charge_role" WHERE id = 999`)
		await queryRunner.query(`DELETE FROM "message" WHERE id = 1000`)
	}
}
