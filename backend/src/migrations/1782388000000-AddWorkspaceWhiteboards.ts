import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkspaceWhiteboards1782388000000
  implements MigrationInterface
{
  name = 'AddWorkspaceWhiteboards1782388000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."whiteboard_operations_type_enum" AS ENUM(
        'stroke',
        'shape',
        'text',
        'move',
        'undo',
        'redo',
        'clear'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "whiteboards" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying(160) NOT NULL,
        "description" text,
        "color" character varying NOT NULL DEFAULT '#3b82f6',
        "icon" character varying(40) NOT NULL DEFAULT 'draw',
        "workspaceId" uuid NOT NULL,
        "boardId" uuid,
        "createdById" uuid,
        "lastSequence" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_whiteboards" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "whiteboard_operations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "whiteboardId" uuid NOT NULL,
        "sequence" integer NOT NULL,
        "userId" uuid NOT NULL,
        "idempotencyKey" character varying(128) NOT NULL,
        "type" "public"."whiteboard_operations_type_enum" NOT NULL,
        "data" jsonb NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_whiteboard_operations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_whiteboard_operation_sequence" UNIQUE ("whiteboardId", "sequence"),
        CONSTRAINT "UQ_whiteboard_operation_idempotency" UNIQUE ("whiteboardId", "userId", "idempotencyKey")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "whiteboard_snapshots" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "whiteboardId" uuid NOT NULL,
        "sequence" integer NOT NULL,
        "data" jsonb NOT NULL,
        "createdById" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_whiteboard_snapshots" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_whiteboard_snapshot_sequence" UNIQUE ("whiteboardId", "sequence")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_whiteboards_workspace_updated" ON "whiteboards" ("workspaceId", "updatedAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_whiteboards_board" ON "whiteboards" ("boardId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_whiteboard_operations_whiteboard_sequence" ON "whiteboard_operations" ("whiteboardId", "sequence")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_whiteboard_snapshots_whiteboard_sequence" ON "whiteboard_snapshots" ("whiteboardId", "sequence")`,
    );

    await queryRunner.query(
      `ALTER TABLE "whiteboards" ADD CONSTRAINT "FK_whiteboards_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "whiteboards" ADD CONSTRAINT "FK_whiteboards_board" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "whiteboards" ADD CONSTRAINT "FK_whiteboards_created_by" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "whiteboard_operations" ADD CONSTRAINT "FK_whiteboard_operations_whiteboard" FOREIGN KEY ("whiteboardId") REFERENCES "whiteboards"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "whiteboard_operations" ADD CONSTRAINT "FK_whiteboard_operations_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "whiteboard_snapshots" ADD CONSTRAINT "FK_whiteboard_snapshots_whiteboard" FOREIGN KEY ("whiteboardId") REFERENCES "whiteboards"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "whiteboard_snapshots" ADD CONSTRAINT "FK_whiteboard_snapshots_created_by" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "whiteboard_snapshots" DROP CONSTRAINT "FK_whiteboard_snapshots_created_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "whiteboard_snapshots" DROP CONSTRAINT "FK_whiteboard_snapshots_whiteboard"`,
    );
    await queryRunner.query(
      `ALTER TABLE "whiteboard_operations" DROP CONSTRAINT "FK_whiteboard_operations_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "whiteboard_operations" DROP CONSTRAINT "FK_whiteboard_operations_whiteboard"`,
    );
    await queryRunner.query(
      `ALTER TABLE "whiteboards" DROP CONSTRAINT "FK_whiteboards_created_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "whiteboards" DROP CONSTRAINT "FK_whiteboards_board"`,
    );
    await queryRunner.query(
      `ALTER TABLE "whiteboards" DROP CONSTRAINT "FK_whiteboards_workspace"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_whiteboard_snapshots_whiteboard_sequence"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_whiteboard_operations_whiteboard_sequence"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_whiteboards_board"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_whiteboards_workspace_updated"`,
    );
    await queryRunner.query(`DROP TABLE "whiteboard_snapshots"`);
    await queryRunner.query(`DROP TABLE "whiteboard_operations"`);
    await queryRunner.query(`DROP TABLE "whiteboards"`);
    await queryRunner.query(`DROP TYPE "public"."whiteboard_operations_type_enum"`);
  }
}
