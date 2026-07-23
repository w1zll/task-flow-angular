import { MigrationInterface, QueryRunner } from 'typeorm';

export class UseGlyphsDiceBearStyle1782301000000
  implements MigrationInterface
{
  name = 'UseGlyphsDiceBearStyle1782301000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "users"
      SET "avatar" = REPLACE(
        "avatar",
        '/10.x/initials/svg',
        '/10.x/glyphs/svg'
      )
      WHERE
        "avatarProvider" = 'dicebear'
        AND "avatar" LIKE '%/10.x/initials/svg%'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "users"
      SET "avatar" = REPLACE(
        "avatar",
        '/10.x/glyphs/svg',
        '/10.x/initials/svg'
      )
      WHERE
        "avatarProvider" = 'dicebear'
        AND "avatar" LIKE '%/10.x/glyphs/svg%'
    `);
  }
}
