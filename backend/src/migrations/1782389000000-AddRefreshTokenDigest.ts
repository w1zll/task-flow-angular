import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshTokenDigest1782389000000 implements MigrationInterface {
  name = 'AddRefreshTokenDigest1782389000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD "tokenDigest" character varying`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_refresh_tokens_tokenDigest" ON "refresh_tokens" ("tokenDigest")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_refresh_tokens_tokenDigest"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP COLUMN "tokenDigest"`,
    );
  }
}
