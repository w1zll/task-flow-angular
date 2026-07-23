import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkspacePublicInvites1782381000000
  implements MigrationInterface
{
  name = 'AddWorkspacePublicInvites1782381000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "workspace_invites" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspaceId" uuid NOT NULL,
        "tokenHash" character varying(64) NOT NULL,
        "createdById" uuid NOT NULL,
        "defaultRole" "public"."workspace_members_role_enum" NOT NULL DEFAULT 'member',
        "expiresAt" TIMESTAMP NOT NULL,
        "maxUses" integer,
        "usesCount" integer NOT NULL DEFAULT 0,
        "revokedAt" TIMESTAMP,
        "allowedEmailDomain" character varying(255),
        "allowedEmail" character varying(100),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_workspace_invites_token_hash" UNIQUE ("tokenHash"),
        CONSTRAINT "CHK_workspace_invites_max_uses" CHECK ("maxUses" IS NULL OR "maxUses" > 0),
        CONSTRAINT "CHK_workspace_invites_uses_count" CHECK ("usesCount" >= 0),
        CONSTRAINT "PK_workspace_invites" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_workspace_invites_workspace" ON "workspace_invites" ("workspaceId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_workspace_invites_active" ON "workspace_invites" ("workspaceId", "expiresAt", "revokedAt")`,
    );

    await queryRunner.query(`
      CREATE TYPE "public"."workspace_invite_audit_events_event_enum"
      AS ENUM(
        'workspace_invite_created',
        'workspace_invite_accepted',
        'workspace_invite_revoked'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "workspace_invite_audit_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspaceId" uuid NOT NULL,
        "inviteId" uuid,
        "actorUserId" uuid,
        "event" "public"."workspace_invite_audit_events_event_enum" NOT NULL,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workspace_invite_audit_events" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_workspace_invite_audit_workspace" ON "workspace_invite_audit_events" ("workspaceId", "createdAt")`,
    );

    await queryRunner.query(
      `ALTER TABLE "workspace_invites" ADD CONSTRAINT "FK_workspace_invites_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_invites" ADD CONSTRAINT "FK_workspace_invites_creator" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_invite_audit_events" ADD CONSTRAINT "FK_workspace_invite_audit_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_invite_audit_events" ADD CONSTRAINT "FK_workspace_invite_audit_invite" FOREIGN KEY ("inviteId") REFERENCES "workspace_invites"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_invite_audit_events" ADD CONSTRAINT "FK_workspace_invite_audit_actor" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workspace_invite_audit_events" DROP CONSTRAINT "FK_workspace_invite_audit_actor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_invite_audit_events" DROP CONSTRAINT "FK_workspace_invite_audit_invite"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_invite_audit_events" DROP CONSTRAINT "FK_workspace_invite_audit_workspace"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_invites" DROP CONSTRAINT "FK_workspace_invites_creator"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_invites" DROP CONSTRAINT "FK_workspace_invites_workspace"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_workspace_invite_audit_workspace"`,
    );
    await queryRunner.query(`DROP TABLE "workspace_invite_audit_events"`);
    await queryRunner.query(
      `DROP TYPE "public"."workspace_invite_audit_events_event_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_workspace_invites_active"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_workspace_invites_workspace"`,
    );
    await queryRunner.query(`DROP TABLE "workspace_invites"`);
  }
}
