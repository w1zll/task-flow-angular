import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAvatarStorageMetadata1782300000000
  implements MigrationInterface
{
  name = 'AddAvatarStorageMetadata1782300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "avatarProvider" character varying(30)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "avatarStorageKey" character varying(500)`,
    );
    await queryRunner.query(`
      UPDATE "users"
      SET
        "avatar" = 'https://api.dicebear.com/10.x/glyphs/svg?seed=' || "id"::text,
        "avatarProvider" = 'dicebear'
      WHERE "avatar" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "avatarStorageKey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "avatarProvider"`,
    );
  }
}
