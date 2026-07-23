import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkspacesFoundation1782380000000
  implements MigrationInterface
{
  name = 'AddWorkspacesFoundation1782380000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."workspace_members_role_enum" AS ENUM('owner', 'admin', 'member')`,
    );
    await queryRunner.query(`
      CREATE TABLE "workspaces" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(120) NOT NULL,
        "isPersonal" boolean NOT NULL DEFAULT false,
        "ownerId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workspaces" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "workspace_members" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspaceId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "role" "public"."workspace_members_role_enum" NOT NULL DEFAULT 'member',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_workspace_members_workspace_user" UNIQUE ("workspaceId", "userId"),
        CONSTRAINT "PK_workspace_members" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "activeWorkspaceId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "boards" ADD "workspaceId" uuid`,
    );

    await queryRunner.query(`
      INSERT INTO "workspaces" (
        "id",
        "name",
        "isPersonal",
        "ownerId",
        "createdAt",
        "updatedAt"
      )
      SELECT
        uuid_generate_v4(),
        LEFT(COALESCE(NULLIF(TRIM("name"), ''), 'Personal') || '''s Workspace', 120),
        true,
        "id",
        now(),
        now()
      FROM "users"
    `);
    await queryRunner.query(`
      INSERT INTO "workspace_members" (
        "workspaceId",
        "userId",
        "role",
        "createdAt",
        "updatedAt"
      )
      SELECT "id", "ownerId", 'owner', now(), now()
      FROM "workspaces"
    `);
    await queryRunner.query(`
      UPDATE "users" AS app_user
      SET "activeWorkspaceId" = workspace."id"
      FROM "workspaces" AS workspace
      WHERE
        workspace."ownerId" = app_user."id"
        AND workspace."isPersonal" = true
    `);
    await queryRunner.query(`
      UPDATE "boards" AS board
      SET "workspaceId" = workspace."id"
      FROM "workspaces" AS workspace
      WHERE
        workspace."ownerId" = board."ownerId"
        AND workspace."isPersonal" = true
    `);
    await queryRunner.query(`
      INSERT INTO "workspace_members" (
        "workspaceId",
        "userId",
        "role",
        "createdAt",
        "updatedAt"
      )
      SELECT DISTINCT
        board."workspaceId",
        board_member."userId",
        'member'::"public"."workspace_members_role_enum",
        now(),
        now()
      FROM "board_members" AS board_member
      INNER JOIN "boards" AS board ON board."id" = board_member."boardId"
      WHERE board."workspaceId" IS NOT NULL
      ON CONFLICT ("workspaceId", "userId") DO NOTHING
    `);

    await queryRunner.query(
      `ALTER TABLE "boards" ALTER COLUMN "workspaceId" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_boards_workspace" ON "boards" ("workspaceId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_workspace_members_user" ON "workspace_members" ("userId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspaces" ADD CONSTRAINT "FK_workspaces_owner" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_members" ADD CONSTRAINT "FK_workspace_members_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_members" ADD CONSTRAINT "FK_workspace_members_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "boards" ADD CONSTRAINT "FK_boards_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_users_active_workspace" FOREIGN KEY ("activeWorkspaceId") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_users_active_workspace"`,
    );
    await queryRunner.query(
      `ALTER TABLE "boards" DROP CONSTRAINT "FK_boards_workspace"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_members" DROP CONSTRAINT "FK_workspace_members_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_members" DROP CONSTRAINT "FK_workspace_members_workspace"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspaces" DROP CONSTRAINT "FK_workspaces_owner"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_workspace_members_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_boards_workspace"`);
    await queryRunner.query(`ALTER TABLE "boards" DROP COLUMN "workspaceId"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "activeWorkspaceId"`,
    );
    await queryRunner.query(`DROP TABLE "workspace_members"`);
    await queryRunner.query(`DROP TABLE "workspaces"`);
    await queryRunner.query(
      `DROP TYPE "public"."workspace_members_role_enum"`,
    );
  }
}
