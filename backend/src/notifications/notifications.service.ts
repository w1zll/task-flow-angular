import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { BoardPermissionsService } from '@/boards/board-permissions.service';
import { Board } from '@/boards/entities/board.entity';
import { BoardMember } from '@/boards/entities/board-member.entity';
import { Task } from '@/tasks/entities/task.entity';
import { TeamMember } from '@/teams/entities/team-member.entity';
import { User } from '@/users/entities/user.entity';
import { toPublicUser } from '@/users/public-user';
import {
  CreateTaskCommentDto,
  NotificationResponseDto,
  TaskCommentResponseDto,
  UpdateTaskCommentDto,
} from './dto/notification.dto';
import { Mention } from './entities/mention.entity';
import {
  Notification,
  NotificationType,
} from './entities/notification.entity';
import { TaskComment } from './entities/task-comment.entity';
import { NotificationsPublisher } from './notifications.publisher';

interface NotificationInput {
  recipientId: string;
  actorId?: string | null;
  type: NotificationType;
  boardId?: string | null;
  taskId?: string | null;
  commentId?: string | null;
  metadata?: Record<string, unknown> | null;
}

const unique = <T>(values: T[]) => Array.from(new Set(values));

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(TaskComment)
    private readonly commentRepo: Repository<TaskComment>,
    @InjectRepository(Mention)
    private readonly mentionRepo: Repository<Mention>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Board)
    private readonly boardRepo: Repository<Board>,
    @InjectRepository(BoardMember)
    private readonly boardMemberRepo: Repository<BoardMember>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepo: Repository<TeamMember>,
    private readonly boardPermissions: BoardPermissionsService,
    private readonly publisher: NotificationsPublisher,
  ) {}

  async listTaskComments(
    taskId: string,
    userId: string,
  ): Promise<TaskCommentResponseDto[]> {
    const task = await this.getTaskWithBoard(taskId);
    await this.boardPermissions.assertCanRead(task.column.boardId, userId);

    const comments = await this.commentRepo.find({
      where: { taskId },
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });
    const mentions = await this.mentionRepo.find({
      where: { taskId },
      relations: ['mentionedUser'],
      order: { createdAt: 'ASC' },
    });
    const mentionsByComment = new Map<string, Mention[]>();
    mentions.forEach((mention) => {
      const current = mentionsByComment.get(mention.commentId) ?? [];
      current.push(mention);
      mentionsByComment.set(mention.commentId, current);
    });

    return comments.map((comment) =>
      this.serializeComment(comment, mentionsByComment.get(comment.id) ?? []),
    );
  }

  async createTaskComment(
    taskId: string,
    dto: CreateTaskCommentDto,
    userId: string,
  ): Promise<TaskCommentResponseDto> {
    const task = await this.getTaskWithBoard(taskId);
    const boardId = task.column.boardId;
    await this.boardPermissions.assertCanEditBoardContent(boardId, userId);
    const body = this.normalizeCommentBody(dto.body);
    const mentionedUserIds = await this.validateMentionedUsers(
      boardId,
      dto.mentionedUserIds ?? [],
    );

    const saved = await this.commentRepo.save(
      this.commentRepo.create({
        taskId,
        boardId,
        authorId: userId,
        body,
      }),
    );
    const mentions = mentionedUserIds.length
      ? await this.mentionRepo.save(
          mentionedUserIds.map((mentionedUserId) =>
            this.mentionRepo.create({
              commentId: saved.id,
              taskId,
              boardId,
              mentionedUserId,
            }),
          ),
        )
      : [];

    const comment = await this.commentRepo.findOne({
      where: { id: saved.id },
      relations: ['author'],
    });
    const hydratedMentions = mentions.length
      ? await this.mentionRepo.find({
          where: { commentId: saved.id },
          relations: ['mentionedUser'],
          order: { createdAt: 'ASC' },
        })
      : [];

    await this.notifyMentionedUsers({
      actorId: userId,
      boardId,
      task,
      commentId: saved.id,
      mentionedUserIds,
    });

    const serialized = this.serializeComment(comment, hydratedMentions);
    this.publisher.emitTaskCommentCreated(boardId, serialized);
    return serialized;
  }

  async updateTaskComment(
    taskId: string,
    commentId: string,
    dto: UpdateTaskCommentDto,
    userId: string,
  ): Promise<TaskCommentResponseDto> {
    const task = await this.getTaskWithBoard(taskId);
    const boardId = task.column.boardId;
    await this.boardPermissions.assertCanEditBoardContent(boardId, userId);

    const comment = await this.commentRepo.findOne({
      where: { id: commentId, taskId },
      relations: ['author'],
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId) {
      throw new ForbiddenException('Only the author can edit this comment');
    }

    if (dto.body !== undefined) {
      comment.body = this.normalizeCommentBody(dto.body);
    }
    await this.commentRepo.save(comment);

    if (dto.mentionedUserIds !== undefined) {
      const mentionedUserIds = await this.validateMentionedUsers(
        boardId,
        dto.mentionedUserIds,
      );
      await this.mentionRepo.delete({ commentId });
      if (mentionedUserIds.length) {
        await this.mentionRepo.save(
          mentionedUserIds.map((mentionedUserId) =>
            this.mentionRepo.create({
              commentId,
              taskId,
              boardId,
              mentionedUserId,
            }),
          ),
        );
      }
    }

    const mentions = await this.mentionRepo.find({
      where: { commentId },
      relations: ['mentionedUser'],
      order: { createdAt: 'ASC' },
    });

    const serialized = this.serializeComment(comment, mentions);
    this.publisher.emitTaskCommentUpdated(boardId, serialized);
    return serialized;
  }

  async deleteTaskComment(
    taskId: string,
    commentId: string,
    userId: string,
  ): Promise<void> {
    const task = await this.getTaskWithBoard(taskId);
    await this.boardPermissions.assertCanEditBoardContent(
      task.column.boardId,
      userId,
    );
    const comment = await this.commentRepo.findOne({
      where: { id: commentId, taskId },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId) {
      throw new ForbiddenException('Only the author can delete this comment');
    }
    await this.commentRepo.remove(comment);
    this.publisher.emitTaskCommentDeleted(task.column.boardId, taskId, commentId);
  }

  async listNotifications(
    userId: string,
    unreadOnly = false,
  ): Promise<NotificationResponseDto[]> {
    const qb = this.notificationRepo
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.actor', 'actor')
      .where('notification.recipientId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC')
      .take(50);

    if (unreadOnly) {
      qb.andWhere('notification.readAt IS NULL');
    }

    return (await qb.getMany()).map((notification) =>
      this.serializeNotification(notification),
    );
  }

  countUnread(userId: string): Promise<number> {
    return this.notificationRepo.count({
      where: { recipientId: userId, readAt: IsNull() },
    });
  }

  async markRead(
    notificationId: string,
    userId: string,
  ): Promise<NotificationResponseDto> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId, recipientId: userId },
      relations: ['actor'],
    });
    if (!notification) throw new NotFoundException('Notification not found');
    if (!notification.readAt) {
      notification.readAt = new Date();
      await this.notificationRepo.save(notification);
      await this.emitUnreadCount(userId);
    }
    return this.serializeNotification(notification);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notificationRepo.update(
      { recipientId: userId, readAt: IsNull() },
      { readAt: new Date() },
    );
    await this.emitUnreadCount(userId);
  }

  async notifyTaskAssigned(params: {
    actorId: string;
    boardId: string;
    taskId: string;
    taskTitle: string;
    assigneeId?: string | null;
  }) {
    if (!params.assigneeId || params.assigneeId === params.actorId) return;
    await this.createNotification({
      recipientId: params.assigneeId,
      actorId: params.actorId,
      type: NotificationType.TASK_ASSIGNED,
      boardId: params.boardId,
      taskId: params.taskId,
      metadata: {
        taskTitle: params.taskTitle,
      },
    });
  }

  async notifyTeamTaskChanged(params: {
    actorId: string;
    boardId: string;
    taskId: string;
    taskTitle: string;
    teamId?: string | null;
  }) {
    if (!params.teamId) return;
    const members = await this.teamMemberRepo.find({
      where: { teamId: params.teamId },
      select: { userId: true },
    });
    const recipientIds = unique(
      members
        .map((member) => member.userId)
        .filter((userId) => userId !== params.actorId),
    );
    await this.createManyNotifications(
      recipientIds.map((recipientId) => ({
        recipientId,
        actorId: params.actorId,
        type: NotificationType.TEAM_TASK_CHANGED,
        boardId: params.boardId,
        taskId: params.taskId,
        metadata: {
          taskTitle: params.taskTitle,
          teamId: params.teamId,
        },
      })),
    );
  }

  async notifyBoardMemberAdded(params: {
    actorId: string;
    boardId: string;
    recipientId: string;
    boardTitle?: string | null;
  }) {
    if (params.recipientId === params.actorId) return;
    await this.createNotification({
      recipientId: params.recipientId,
      actorId: params.actorId,
      type: NotificationType.BOARD_MEMBER_ADDED,
      boardId: params.boardId,
      metadata: {
        boardTitle: params.boardTitle ?? null,
      },
    });
  }

  emitTaskCreated(boardId: string, task: unknown) {
    this.publisher.emitTaskCreated(boardId, task);
  }

  emitTaskDeleted(boardId: string, taskId: string) {
    this.publisher.emitTaskDeleted(boardId, taskId);
  }

  private async notifyMentionedUsers(params: {
    actorId: string;
    boardId: string;
    task: Task;
    commentId: string;
    mentionedUserIds: string[];
  }) {
    const recipientIds = params.mentionedUserIds.filter(
      (mentionedUserId) => mentionedUserId !== params.actorId,
    );
    await this.createManyNotifications(
      recipientIds.map((recipientId) => ({
        recipientId,
        actorId: params.actorId,
        type: NotificationType.MENTION,
        boardId: params.boardId,
        taskId: params.task.id,
        commentId: params.commentId,
        metadata: {
          taskTitle: params.task.title,
        },
      })),
    );
  }

  private async createManyNotifications(inputs: NotificationInput[]) {
    for (const input of inputs) {
      await this.createNotification(input);
    }
  }

  private async createNotification(
    input: NotificationInput,
  ): Promise<NotificationResponseDto> {
    const metadata = await this.withBoardMetadata(
      input.boardId ?? null,
      input.metadata ?? null,
    );
    const saved = await this.notificationRepo.save(
      this.notificationRepo.create({
        recipientId: input.recipientId,
        actorId: input.actorId ?? null,
        type: input.type,
        boardId: input.boardId ?? null,
        taskId: input.taskId ?? null,
        commentId: input.commentId ?? null,
        metadata,
        readAt: null,
      }),
    );
    const notification = await this.notificationRepo.findOne({
      where: { id: saved.id },
      relations: ['actor'],
    });
    const serialized = this.serializeNotification(notification);
    this.publisher.emitNotification(input.recipientId, serialized);
    await this.emitUnreadCount(input.recipientId);
    return serialized;
  }

  private async withBoardMetadata(
    boardId: string | null,
    metadata: Record<string, unknown> | null,
  ): Promise<Record<string, unknown> | null> {
    if (!boardId) return metadata;
    const board = await this.boardRepo.findOne({
      where: { id: boardId },
      select: { id: true, title: true, workspaceId: true },
    });
    if (!board) return metadata;

    return {
      ...(metadata ?? {}),
      workspaceId: metadata?.workspaceId ?? board.workspaceId,
      boardTitle: metadata?.boardTitle ?? board.title,
    };
  }

  private async emitUnreadCount(userId: string) {
    this.publisher.emitUnreadCount(userId, await this.countUnread(userId));
  }

  private async getTaskWithBoard(taskId: string): Promise<Task> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ['column', 'column.board'],
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  private normalizeCommentBody(body: string): string {
    const normalized = body.replace(/\r\n/g, '\n').trim();
    if (!normalized) throw new BadRequestException('Comment cannot be empty');
    return normalized;
  }

  private async validateMentionedUsers(
    boardId: string,
    mentionedUserIds: string[],
  ): Promise<string[]> {
    const ids = unique(mentionedUserIds.filter(Boolean));
    if (!ids.length) return [];

    const board = await this.boardRepo.findOne({
      where: { id: boardId },
      select: { id: true, ownerId: true },
    });
    if (!board) throw new NotFoundException('Board not found');

    const members = await this.boardMemberRepo.find({
      where: { boardId },
      select: { userId: true },
    });
    const allowedUserIds = new Set([
      board.ownerId,
      ...members.map((member) => member.userId),
    ]);
    const invalidMention = ids.find((id) => !allowedUserIds.has(id));
    if (invalidMention) {
      throw new ForbiddenException(
        'Mentioned users must have access to this board',
      );
    }

    const existing = await this.userRepo.find({
      where: { id: In(ids) },
      select: { id: true },
    });
    if (existing.length !== ids.length) {
      throw new NotFoundException('Mentioned user not found');
    }
    return ids;
  }

  private serializeComment(
    comment: TaskComment,
    mentions: Mention[] = [],
  ): TaskCommentResponseDto {
    return {
      ...comment,
      author: toPublicUser(comment.author),
      mentions: mentions.map((mention) => ({
        ...mention,
        mentionedUser: toPublicUser(mention.mentionedUser),
      })),
    } as unknown as TaskCommentResponseDto;
  }

  private serializeNotification(
    notification: Notification,
  ): NotificationResponseDto {
    return {
      ...notification,
      actor: notification.actor ? toPublicUser(notification.actor) : null,
    } as unknown as NotificationResponseDto;
  }
}
