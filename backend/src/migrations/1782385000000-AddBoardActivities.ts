import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBoardActivities1782385000000 implements MigrationInterface {
  name = 'AddBoardActivities1782385000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "board_activity_event_enum" AS ENUM(
        'board_created',
        'board_updated',
        'board_member_invited',
        'board_member_role_changed',
        'board_member_removed',
        'task_created',
        'task_updated',
        'task_completed',
        'task_moved',
        'task_reordered',
        'task_deleted',
        'column_created',
        'column_updated',
        'column_reordered',
        'column_deleted'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "board_activities" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "boardId" uuid NOT NULL,
        "actorUserId" uuid,
        "event" "board_activity_event_enum" NOT NULL,
        "entityType" varchar(32) NOT NULL,
        "entityId" uuid,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_board_activities" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_board_activities_boardId" ON "board_activities" ("boardId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_board_activities_createdAt" ON "board_activities" ("createdAt" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_board_activities_event" ON "board_activities" ("event")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_board_activities_entity" ON "board_activities" ("entityType", "entityId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "board_activities" ADD CONSTRAINT "FK_board_activities_board" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "board_activities" ADD CONSTRAINT "FK_board_activities_actorUser" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "board_activities" DROP CONSTRAINT "FK_board_activities_actorUser"`,
    );
    await queryRunner.query(
      `ALTER TABLE "board_activities" DROP CONSTRAINT "FK_board_activities_board"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_board_activities_createdAt"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_board_activities_event"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_board_activities_entity"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_board_activities_boardId"`,
    );
    await queryRunner.query(`DROP TABLE "board_activities"`);
    await queryRunner.query(`DROP TYPE "board_activity_event_enum"`);
  }
}
