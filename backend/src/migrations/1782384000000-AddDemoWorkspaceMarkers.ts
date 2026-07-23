import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDemoWorkspaceMarkers1782384000000
  implements MigrationInterface
{
  name = 'AddDemoWorkspaceMarkers1782384000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workspaces"
        ADD "isDemoTemplate" boolean NOT NULL DEFAULT false,
        ADD "isDemoInstance" boolean NOT NULL DEFAULT false,
        ADD "demoExpiresAt" TIMESTAMP NULL,
        ADD "demoSourceWorkspaceId" uuid NULL
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_workspaces_demo_markers" ON "workspaces" ("isDemoTemplate", "isDemoInstance")`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspaces" ADD CONSTRAINT "FK_workspaces_demo_source" FOREIGN KEY ("demoSourceWorkspaceId") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workspaces" DROP CONSTRAINT "FK_workspaces_demo_source"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_workspaces_demo_markers"`,
    );
    await queryRunner.query(`
      ALTER TABLE "workspaces"
        DROP COLUMN "demoSourceWorkspaceId",
        DROP COLUMN "demoExpiresAt",
        DROP COLUMN "isDemoInstance",
        DROP COLUMN "isDemoTemplate"
    `);
  }
}
