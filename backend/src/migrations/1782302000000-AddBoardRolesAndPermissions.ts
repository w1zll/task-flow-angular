import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBoardRolesAndPermissions1782302000000
  implements MigrationInterface
{
  name = 'AddBoardRolesAndPermissions1782302000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."board_members_role_enum" AS ENUM('owner', 'editor', 'viewer')`,
    );
    await queryRunner.query(
      `ALTER TABLE "board_members" ADD "role" "public"."board_members_role_enum" NOT NULL DEFAULT 'editor'`,
    );
    await queryRunner.query(
      `ALTER TABLE "board_members" ADD "invitedById" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "board_members" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`
      UPDATE "board_members" AS member
      SET "invitedById" = board."ownerId"
      FROM "boards" AS board
      WHERE board."id" = member."boardId"
    `);
    await queryRunner.query(
      `ALTER TABLE "board_members" ADD CONSTRAINT "FK_board_members_invited_by" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "board_members" DROP CONSTRAINT "FK_board_members_invited_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "board_members" DROP COLUMN "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "board_members" DROP COLUMN "invitedById"`,
    );
    await queryRunner.query(`ALTER TABLE "board_members" DROP COLUMN "role"`);
    await queryRunner.query(
      `DROP TYPE "public"."board_members_role_enum"`,
    );
  }
}
