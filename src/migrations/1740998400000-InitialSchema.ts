import { MigrationInterface, QueryRunner } from 'typeorm'

export class InitialSchema1740998400000 implements MigrationInterface {
	name = 'InitialSchema1740998400000'

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "app_meta" ("key" character varying NOT NULL, "value" character varying NOT NULL, CONSTRAINT "PK_2517812d17c14a0ecd40dd79d63" PRIMARY KEY ("key"))`,
		)
		await queryRunner.query(
			`CREATE TABLE "whatsapp_instances" ("clientId" character varying NOT NULL, "token" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'disconnected', "name" character varying, "profileName" character varying, "profilePicUrl" character varying, "owner" character varying, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2a90c3646c36360009757f791ca" PRIMARY KEY ("clientId"))`,
		)
		await queryRunner.query(
			`CREATE TABLE "customer" ("id" character varying NOT NULL, "active" boolean NOT NULL DEFAULT true, "name" character varying NOT NULL, "contact" character varying NOT NULL, "bithday" date, "bithdaySentDate" date, "lastPurchaseDate" date, "lastPurchaseValue" integer, "company" character varying NOT NULL DEFAULT '', "sendBithday" boolean NOT NULL DEFAULT true, "sendCharge" boolean NOT NULL DEFAULT true, "sendBankSlip" boolean NOT NULL DEFAULT true, "sendNfe" boolean NOT NULL DEFAULT true, "sendSale" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_a7a13f4cacb744524e44dfdad32" PRIMARY KEY ("id"))`,
		)
		await queryRunner.query(
			`CREATE TABLE "sale" ("id" character varying NOT NULL, "seller" character varying NOT NULL, "paymentMethod" character varying NOT NULL, "installments" integer NOT NULL, "grossValue" numeric NOT NULL, "netValue" numeric NOT NULL, "discount" numeric NOT NULL, "discountPercent" numeric NOT NULL, "date" date NOT NULL, "hour" TIME NOT NULL, "active" boolean NOT NULL DEFAULT true, "sentSale" boolean NOT NULL DEFAULT false, "companyName" character varying NOT NULL, "companyID" integer NOT NULL, "transportName" character varying, "transportPlate" character varying, "freightType" character varying, "freightValue" numeric, "packageQuantity" integer, "grossWeight" integer, "netWeight" integer, "expenses" numeric, "warranty" numeric, "entryValue" integer, "observation" text, "fk_customer" character varying, CONSTRAINT "PK_d03891c457cbcd22974732b5de2" PRIMARY KEY ("id"))`,
		)
		await queryRunner.query(
			`CREATE TABLE "pdf" ("id" character varying NOT NULL, "ourNumber" text, "nfeNumber" text, "sentBankSlip" boolean NOT NULL DEFAULT false, "sentNfe" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "active" boolean NOT NULL DEFAULT true, "fk_customer" character varying, CONSTRAINT "PK_395fa8d4021d7d68d72378ce096" PRIMARY KEY ("id"))`,
		)
		await queryRunner.query(
			`CREATE TABLE "message" ("id" SERIAL NOT NULL, "message" character varying NOT NULL, CONSTRAINT "PK_ba01f0a3e0123651915008bc578" PRIMARY KEY ("id"))`,
		)
		await queryRunner.query(
			`CREATE TABLE "message_variable" ("id" SERIAL NOT NULL, "variables" text NOT NULL, "function" character varying NOT NULL, CONSTRAINT "PK_341d2ca5b230ca2137975032cba" PRIMARY KEY ("id"))`,
		)
		await queryRunner.query(
			`CREATE TABLE "log" ("id" SERIAL NOT NULL, "whatsappNumber" character varying NOT NULL, "module" character varying NOT NULL, "obs" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "fk_customer" character varying, CONSTRAINT "PK_350604cbdf991d5930d9e618fbd" PRIMARY KEY ("id"))`,
		)
		await queryRunner.query(`CREATE TYPE "public"."charge_interesttype_enum" AS ENUM('S', 'D', 'M')`)
		await queryRunner.query(
			`CREATE TABLE "charge" ("id" character varying NOT NULL, "expiration" date NOT NULL, "value" numeric NOT NULL, "interest" numeric NOT NULL DEFAULT '0', "interestType" "public"."charge_interesttype_enum" NOT NULL DEFAULT 'S', "fine" numeric NOT NULL DEFAULT '0', "installment" integer NOT NULL, "qtdInstallments" integer NOT NULL, "type" character varying NOT NULL, "qtdSents" integer NOT NULL, "lastSentDate" TIMESTAMP, "paymentDate" TIMESTAMP, "active" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "company" character varying NOT NULL DEFAULT '', "lastChargeRoleId" integer, "fk_customer" character varying, CONSTRAINT "PK_ac0381acde3bdffe41ad57cd942" PRIMARY KEY ("id"))`,
		)
		await queryRunner.query(
			`CREATE TABLE "all_config" ("id" SERIAL NOT NULL, "runAuto" boolean NOT NULL, "runTime" TIME NOT NULL, "runFirebird" TIME NOT NULL, "runInstance" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ef7cf55692ee41c045660838d3c" PRIMARY KEY ("id"))`,
		)
		await queryRunner.query(
			`CREATE TABLE "anniversary_sent" ("id" SERIAL NOT NULL, "isntance" character varying NOT NULL, "sentDate" TIMESTAMP NOT NULL, "message" character varying NOT NULL, "fk_customer" character varying, CONSTRAINT "PK_33519c6e0dcfa9e7cae162012f4" PRIMARY KEY ("id"))`,
		)
		await queryRunner.query(
			`ALTER TABLE "sale" ADD CONSTRAINT "FK_7bd98d8a271e3b78b8312e29d29" FOREIGN KEY ("fk_customer") REFERENCES "customer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		)
		await queryRunner.query(
			`ALTER TABLE "pdf" ADD CONSTRAINT "FK_97595e8b035d8d77ca8eadd3096" FOREIGN KEY ("fk_customer") REFERENCES "customer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		)
		await queryRunner.query(
			`ALTER TABLE "log" ADD CONSTRAINT "FK_fac6eb3cb1cdb43fdd912455d9e" FOREIGN KEY ("fk_customer") REFERENCES "customer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		)
		await queryRunner.query(
			`ALTER TABLE "charge" ADD CONSTRAINT "FK_a3b9a973154b2a0bcb421a3bd8d" FOREIGN KEY ("fk_customer") REFERENCES "customer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		)
		await queryRunner.query(
			`ALTER TABLE "anniversary_sent" ADD CONSTRAINT "FK_85efcb917ca026c11f37b6f11a9" FOREIGN KEY ("fk_customer") REFERENCES "customer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		)
		await queryRunner.query(
			`CREATE TABLE "charge_role" ("id" SERIAL NOT NULL, "description" character varying NOT NULL, "qtdDaysLate" integer NOT NULL, "sendBol" boolean NOT NULL, "active" boolean NOT NULL, "autoSend" boolean NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "fk_message" integer, CONSTRAINT "PK_0ecbc4694d447c88c72ecf9923a" PRIMARY KEY ("id"))`,
		)
		await queryRunner.query(
			`ALTER TABLE "charge_role" ADD CONSTRAINT "FK_698bb20d0e6b8e40025cd695344" FOREIGN KEY ("fk_message") REFERENCES "message"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		)
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "anniversary_sent" DROP CONSTRAINT "FK_85efcb917ca026c11f37b6f11a9"`)
		await queryRunner.query(`ALTER TABLE "charge" DROP CONSTRAINT "FK_a3b9a973154b2a0bcb421a3bd8d"`)
		await queryRunner.query(`ALTER TABLE "log" DROP CONSTRAINT "FK_fac6eb3cb1cdb43fdd912455d9e"`)
		await queryRunner.query(`ALTER TABLE "pdf" DROP CONSTRAINT "FK_97595e8b035d8d77ca8eadd3096"`)
		await queryRunner.query(`ALTER TABLE "sale" DROP CONSTRAINT "FK_7bd98d8a271e3b78b8312e29d29"`)
		await queryRunner.query(`DROP TABLE "anniversary_sent"`)
		await queryRunner.query(`DROP TABLE "all_config"`)
		await queryRunner.query(`DROP TABLE "charge"`)
		await queryRunner.query(`DROP TYPE "public"."charge_interesttype_enum"`)
		await queryRunner.query(`DROP TABLE "log"`)
		await queryRunner.query(`DROP TABLE "message_variable"`)
		await queryRunner.query(`DROP TABLE "message"`)
		await queryRunner.query(`DROP TABLE "pdf"`)
		await queryRunner.query(`DROP TABLE "sale"`)
		await queryRunner.query(`DROP TABLE "customer"`)
		await queryRunner.query(`DROP TABLE "whatsapp_instances"`)
		await queryRunner.query(`DROP TABLE "app_meta"`)
		await queryRunner.query(`ALTER TABLE "charge_role" DROP CONSTRAINT "FK_698bb20d0e6b8e40025cd695344"`)
		await queryRunner.query(`DROP TABLE "charge_role"`)
	}
}
