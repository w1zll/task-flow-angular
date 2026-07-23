import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskChecklistsAttachmentsDetails1782387000000
  implements MigrationInterface
{
  name = 'AddTaskChecklistsAttachmentsDetails1782387000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD "estimateMinutes" integer`,
    );
    await queryRunner.query(`ALTER TABLE "tasks" ADD "storyPoints" integer`);

    await queryRunner.query(`
      CREATE TABLE "task_checklist_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "taskId" uuid NOT NULL,
        "title" character varying(500) NOT NULL,
        "isDone" boolean NOT NULL DEFAULT false,
        "order" integer NOT NULL DEFAULT 0,
        "assigneeId" uuid,
        "assigneeName" character varying(200),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_task_checklist_items" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "task_attachments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "taskId" uuid NOT NULL,
        "fileName" character varying(255) NOT NULL,
        "mimeType" character varying(120) NOT NULL,
        "size" integer NOT NULL,
        "url" character varying(1000) NOT NULL,
        "storageKey" character varying(500) NOT NULL,
        "storageProvider" character varying(32) NOT NULL,
        "isImage" boolean NOT NULL DEFAULT false,
        "uploadedById" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_task_attachments" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_task_checklist_items_task_order" ON "task_checklist_items" ("taskId", "order")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_task_attachments_task_created" ON "task_attachments" ("taskId", "createdAt")`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_checklist_items" ADD CONSTRAINT "FK_task_checklist_items_task" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_checklist_items" ADD CONSTRAINT "FK_task_checklist_items_assignee" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_attachments" ADD CONSTRAINT "FK_task_attachments_task" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_attachments" ADD CONSTRAINT "FK_task_attachments_uploaded_by" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "task_attachments" DROP CONSTRAINT "FK_task_attachments_uploaded_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_attachments" DROP CONSTRAINT "FK_task_attachments_task"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_checklist_items" DROP CONSTRAINT "FK_task_checklist_items_assignee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_checklist_items" DROP CONSTRAINT "FK_task_checklist_items_task"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_task_attachments_task_created"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_task_checklist_items_task_order"`,
    );
    await queryRunner.query(`DROP TABLE "task_attachments"`);
    await queryRunner.query(`DROP TABLE "task_checklist_items"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "storyPoints"`);
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP COLUMN "estimateMinutes"`,
    );
  }
}
