import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBoardViews1782383000000 implements MigrationInterface {
  name = 'AddBoardViews1782383000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "board_views" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying(120) NOT NULL,
        "boardId" uuid NOT NULL,
        "ownerId" uuid NOT NULL,
        "filters" jsonb NOT NULL DEFAULT '{}',
        "sort" jsonb NOT NULL DEFAULT '{}',
        "isDefault" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_board_views" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_board_views_board_owner" ON "board_views" ("boardId", "ownerId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "board_views" ADD CONSTRAINT "FK_board_views_board" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "board_views" ADD CONSTRAINT "FK_board_views_owner" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "board_views" DROP CONSTRAINT "FK_board_views_owner"`,
    );
    await queryRunner.query(
      `ALTER TABLE "board_views" DROP CONSTRAINT "FK_board_views_board"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_board_views_board_owner"`,
    );
    await queryRunner.query(`DROP TABLE "board_views"`);
  }
}

