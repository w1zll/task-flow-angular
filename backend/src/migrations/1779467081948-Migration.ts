import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1779467081948 implements MigrationInterface {
    name = 'Migration1779467081948'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "token" character varying NOT NULL, "userId" uuid NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "isRevoked" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_4542dd2f38a61354a040ba9fd57" UNIQUE ("token"), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."tasks_priority_enum" AS ENUM('low', 'medium', 'high', 'urgent')`);
        await queryRunner.query(`CREATE TABLE "tasks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(500) NOT NULL, "description" text, "priority" "public"."tasks_priority_enum" NOT NULL DEFAULT 'medium', "order" integer NOT NULL DEFAULT '0', "labels" text, "dueDate" TIMESTAMP, "assigneeName" character varying(200), "assigneeId" uuid, "isCompleted" boolean NOT NULL DEFAULT false, "completedAt" TIMESTAMP, "columnId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "columns" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(200) NOT NULL, "order" integer NOT NULL DEFAULT '0', "boardId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4ac339ccbbfed1dcd96812abbd5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "board_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "boardId" uuid NOT NULL, "userId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_345cd31bb32ae01f9fbc5ac3a1c" UNIQUE ("boardId", "userId"), CONSTRAINT "PK_6994cea1393b5fa3a0dd827a9f7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "boards" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(200) NOT NULL, "description" text, "color" character varying NOT NULL DEFAULT '#669266', "ownerId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_606923b0b068ef262dfdcd18f44" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(100) NOT NULL, "name" character varying(100) NOT NULL, "password" character varying NOT NULL, "avatar" character varying(500), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_610102b60fea1455310ccd299de" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_9a16d2c86252529f622fa53f1e3" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_0ecfe75e5bd731e00e634d70e5f" FOREIGN KEY ("columnId") REFERENCES "columns"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "columns" ADD CONSTRAINT "FK_ac92bfd7ba33174aabef610f361" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "board_members" ADD CONSTRAINT "FK_8dfe924ec592792320086ebb692" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "board_members" ADD CONSTRAINT "FK_2af5912734e7fbedc23afd07adc" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "boards" ADD CONSTRAINT "FK_dcdf669d9c6727190556702de56" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "boards" DROP CONSTRAINT "FK_dcdf669d9c6727190556702de56"`);
        await queryRunner.query(`ALTER TABLE "board_members" DROP CONSTRAINT "FK_2af5912734e7fbedc23afd07adc"`);
        await queryRunner.query(`ALTER TABLE "board_members" DROP CONSTRAINT "FK_8dfe924ec592792320086ebb692"`);
        await queryRunner.query(`ALTER TABLE "columns" DROP CONSTRAINT "FK_ac92bfd7ba33174aabef610f361"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_0ecfe75e5bd731e00e634d70e5f"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_9a16d2c86252529f622fa53f1e3"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_610102b60fea1455310ccd299de"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "boards"`);
        await queryRunner.query(`DROP TABLE "board_members"`);
        await queryRunner.query(`DROP TABLE "columns"`);
        await queryRunner.query(`DROP TABLE "tasks"`);
        await queryRunner.query(`DROP TYPE "public"."tasks_priority_enum"`);
        await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    }

}
