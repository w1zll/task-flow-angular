import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkspaceTeams1782382000000 implements MigrationInterface {
  name = 'AddWorkspaceTeams1782382000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "teams" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(120) NOT NULL,
        "description" text,
        "color" character varying(7) NOT NULL DEFAULT '#669266',
        "workspaceId" uuid NOT NULL,
        "createdById" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_teams_workspace_name" UNIQUE ("workspaceId", "name"),
        CONSTRAINT "PK_teams" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "team_members" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "teamId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_team_members_team_user" UNIQUE ("teamId", "userId"),
        CONSTRAINT "PK_team_members" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`ALTER TABLE "tasks" ADD "teamId" uuid`);
    await queryRunner.query(
      `CREATE INDEX "IDX_teams_workspace" ON "teams" ("workspaceId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_team_members_team" ON "team_members" ("teamId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_team_members_user" ON "team_members" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tasks_team" ON "tasks" ("teamId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" ADD CONSTRAINT "FK_teams_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" ADD CONSTRAINT "FK_teams_created_by" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_members" ADD CONSTRAINT "FK_team_members_team" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_members" ADD CONSTRAINT "FK_team_members_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_tasks_team" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_team"`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_members" DROP CONSTRAINT "FK_team_members_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_members" DROP CONSTRAINT "FK_team_members_team"`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" DROP CONSTRAINT "FK_teams_created_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" DROP CONSTRAINT "FK_teams_workspace"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_tasks_team"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_team_members_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_team_members_team"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_teams_workspace"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "teamId"`);
    await queryRunner.query(`DROP TABLE "team_members"`);
    await queryRunner.query(`DROP TABLE "teams"`);
  }
}
