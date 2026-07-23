import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskCommentsMentionsNotifications1782386000000
  implements MigrationInterface
{
  name = 'AddTaskCommentsMentionsNotifications1782386000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "notifications_type_enum" AS ENUM(
        'mention',
        'task_assigned',
        'team_task_changed',
        'board_member_added'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "task_comments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "taskId" uuid NOT NULL,
        "boardId" uuid NOT NULL,
        "authorId" uuid NOT NULL,
        "body" text NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_task_comments" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "mentions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "commentId" uuid NOT NULL,
        "taskId" uuid NOT NULL,
        "boardId" uuid NOT NULL,
        "mentionedUserId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_mentions_comment_user" UNIQUE ("commentId", "mentionedUserId"),
        CONSTRAINT "PK_mentions" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "recipientId" uuid NOT NULL,
        "actorId" uuid,
        "type" "notifications_type_enum" NOT NULL,
        "boardId" uuid,
        "taskId" uuid,
        "commentId" uuid,
        "metadata" jsonb,
        "readAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_task_comments_task" ON "task_comments" ("taskId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_task_comments_board" ON "task_comments" ("boardId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_mentions_user" ON "mentions" ("mentionedUserId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_mentions_task" ON "mentions" ("taskId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_recipient" ON "notifications" ("recipientId", "createdAt" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_unread" ON "notifications" ("recipientId", "readAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_task" ON "notifications" ("taskId")`,
    );

    await queryRunner.query(
      `ALTER TABLE "task_comments" ADD CONSTRAINT "FK_task_comments_task" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_comments" ADD CONSTRAINT "FK_task_comments_board" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_comments" ADD CONSTRAINT "FK_task_comments_author" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mentions" ADD CONSTRAINT "FK_mentions_comment" FOREIGN KEY ("commentId") REFERENCES "task_comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mentions" ADD CONSTRAINT "FK_mentions_task" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mentions" ADD CONSTRAINT "FK_mentions_board" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mentions" ADD CONSTRAINT "FK_mentions_user" FOREIGN KEY ("mentionedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_recipient" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_actor" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_board" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_task" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_comment" FOREIGN KEY ("commentId") REFERENCES "task_comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_comment"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_task"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_board"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_actor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_recipient"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mentions" DROP CONSTRAINT "FK_mentions_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mentions" DROP CONSTRAINT "FK_mentions_board"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mentions" DROP CONSTRAINT "FK_mentions_task"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mentions" DROP CONSTRAINT "FK_mentions_comment"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_comments" DROP CONSTRAINT "FK_task_comments_author"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_comments" DROP CONSTRAINT "FK_task_comments_board"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_comments" DROP CONSTRAINT "FK_task_comments_task"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_task"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_unread"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_notifications_recipient"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_mentions_task"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_mentions_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_task_comments_board"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_task_comments_task"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TABLE "mentions"`);
    await queryRunner.query(`DROP TABLE "task_comments"`);
    await queryRunner.query(`DROP TYPE "notifications_type_enum"`);
  }
}
