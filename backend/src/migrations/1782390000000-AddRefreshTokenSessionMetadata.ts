import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshTokenSessionMetadata1782390000000 implements MigrationInterface {
  name = 'AddRefreshTokenSessionMetadata1782390000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD "userAgent" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD "ipAddress" character varying(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD "lastActiveAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `UPDATE "refresh_tokens" SET "lastActiveAt" = "createdAt"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP COLUMN "lastActiveAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP COLUMN "ipAddress"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP COLUMN "userAgent"`,
    );
  }
}
