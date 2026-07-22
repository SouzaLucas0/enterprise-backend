import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm'

export class AddFirstMessageSentToCustomer1740998500000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.addColumn(
			'customer',
			new TableColumn({
				name: 'firstMessageSent',
				type: 'boolean',
				default: false,
				isNullable: false,
			}),
		)
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropColumn('customer', 'firstMessageSent')
	}
}
