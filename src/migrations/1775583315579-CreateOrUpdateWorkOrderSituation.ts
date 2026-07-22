import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateOrUpdateWorkOrderSituation1775583315579 implements MigrationInterface {
    name = 'CreateOrUpdateWorkOrderSituation1775583315579'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "work_order" ("id" character varying NOT NULL, "situation" character varying NOT NULL, "date" date NOT NULL, "prisma" integer NOT NULL, "brand" character varying NOT NULL, "model" character varying NOT NULL, "vehiclePlate" character varying NOT NULL, "km" integer NOT NULL, "defect" text NOT NULL, "belongings" text NOT NULL, "forecast" date NOT NULL, "mechanic" character varying NOT NULL, "active" boolean NOT NULL DEFAULT true, "lastSituationSent" character varying, "fk_customer" character varying, CONSTRAINT "PK_0730e63dd523d397530859cb6d1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "work_order_situation" ("id" integer NOT NULL, "description" character varying NOT NULL, "active" boolean NOT NULL, "messageId" integer, CONSTRAINT "REL_d92eb8cfdc1fca0ac2445b9b92" UNIQUE ("messageId"), CONSTRAINT "PK_c1d72deb3f8b77419fefb31bf2a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "customer" ADD "sendOS" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "work_order" ADD CONSTRAINT "FK_5831a3fb6b717780073880598a4" FOREIGN KEY ("fk_customer") REFERENCES "customer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "work_order_situation" ADD CONSTRAINT "FK_d92eb8cfdc1fca0ac2445b9b92f" FOREIGN KEY ("messageId") REFERENCES "message"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

        const workOrderVariablesExists = await queryRunner.query(
            `SELECT * FROM "message_variable" WHERE function = $1`,
            ['workOrder'],
        );

        if (workOrderVariablesExists.length === 0) {
            await queryRunner.query(
                `INSERT INTO "message_variable" (variables, function) VALUES ($1, $2)`,
                [
                    '{{numeroOS}},{{nomeEmpresa}},{{nomeCliente}},{{dataOS}},{{descricaoObjeto}},{{marca}},{{modelo}},{{placa}},{{km}},{{defeitos}},{{pertences}},{{previsaoEntrega}},{{mecanico}},{{prisma}}',
                    'workOrder',
                ],
            );
        }

        // Inserir linha em ALL_CONFIG somente se a tabela existir
        try {
            await queryRunner.query(`INSERT INTO "all_config" (id, "runAuto", "runTime", "runFirebird", "runInstance") VALUES (6, false, '00:05:00', '08:00:00', NULL);`);
        } catch (e) {
            // Se a tabela não existir, ignora o erro
            if (!/all_config/.test(e.message)) throw e;
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "message_variable" WHERE function = $1`, ['workOrder']);
        await queryRunner.query(`ALTER TABLE "work_order_situation" DROP CONSTRAINT "FK_d92eb8cfdc1fca0ac2445b9b92f"`);
        await queryRunner.query(`ALTER TABLE "work_order" DROP CONSTRAINT "FK_5831a3fb6b717780073880598a4"`);
        await queryRunner.query(`ALTER TABLE "customer" DROP COLUMN "sendOS"`);
        await queryRunner.query(`DROP TABLE "work_order_situation"`);
        await queryRunner.query(`DROP TABLE "work_order"`);
    }

}
