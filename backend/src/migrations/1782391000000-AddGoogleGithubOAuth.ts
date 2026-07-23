import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoogleGithubOAuth1782391000000 implements MigrationInterface {
  name = 'AddGoogleGithubOAuth1782391000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL`,
    );
    await queryRunner.query(`
      CREATE TABLE "auth_identities" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "provider" character varying(20) NOT NULL,
        "providerSubject" character varying(255) NOT NULL,
        "providerEmail" character varying(320),
        "emailVerified" boolean NOT NULL DEFAULT false,
        "displayName" character varying(120),
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auth_identities" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_auth_identities_provider" CHECK ("provider" IN ('google', 'github')),
        CONSTRAINT "UQ_auth_identities_provider_subject" UNIQUE ("provider", "providerSubject"),
        CONSTRAINT "UQ_auth_identities_user_provider" UNIQUE ("userId", "provider"),
        CONSTRAINT "FK_auth_identities_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "oauth_attempts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "provider" character varying(20) NOT NULL,
        "intent" character varying(10) NOT NULL,
        "stateHash" character varying(64) NOT NULL,
        "browserBindingHash" character varying(64) NOT NULL,
        "protectedPayload" text NOT NULL,
        "nonceHash" character varying(64),
        "userId" uuid,
        "sessionId" uuid,
        "expiresAt" TIMESTAMP NOT NULL,
        "consumedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_oauth_attempts" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_oauth_attempts_provider" CHECK ("provider" IN ('google', 'github')),
        CONSTRAINT "CHK_oauth_attempts_intent" CHECK ("intent" IN ('login', 'link')),
        CONSTRAINT "UQ_oauth_attempts_stateHash" UNIQUE ("stateHash")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_oauth_attempts_expiresAt" ON "oauth_attempts" ("expiresAt")`,
    );
    await queryRunner.query(`
      CREATE TABLE "auth_audit_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "event" character varying(40) NOT NULL,
        "provider" character varying(20) NOT NULL,
        "userId" uuid,
        "sessionId" uuid,
        "errorCode" character varying(40),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auth_audit_events" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "auth_audit_events"`);
    await queryRunner.query(`DROP TABLE "oauth_attempts"`);
    await queryRunner.query(`DROP TABLE "auth_identities"`);
    await queryRunner.query(
      `UPDATE "users" SET "password" = 'oauth-disabled' WHERE "password" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "password" SET NOT NULL`,
    );
  }
}
