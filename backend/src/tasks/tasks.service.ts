import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { BoardPermissionsService } from '@/boards/board-permissions.service';
import { Board } from '@/boards/entities/board.entity';
import { Column } from '@/columns/entities/column.entity';
import { FrontendCacheService } from '@/common/frontend-cache/frontend-cache.service';
import { User } from '@/users/entities/user.entity';
import { toPublicUser } from '@/users/public-user';
import {
  AnalyticsQueryDto,
  CreateTaskDto,
  CreateTaskChecklistItemDto,
  MoveTaskDto,
  ReorderTaskChecklistItemsDto,
  ReorderTasksDto,
  UpdateTaskChecklistItemDto,
  UpdateTaskDto,
} from './dto/task.dto';
import { Task, TaskPriority } from './entities/task.entity';
import { TaskAttachment } from './entities/task-attachment.entity';
import { TaskChecklistItem } from './entities/task-checklist-item.entity';
import { WorkspacesService } from '@/workspaces/workspaces.service';
import { Team } from '@/teams/entities/team.entity';
import { BoardActivityEventsService } from '@/boards/board-activity-events.service';
import { NotificationsService } from '@/notifications/notifications.service';
import {
  MAX_TASK_ATTACHMENT_SIZE_BYTES,
  MAX_WORKSPACE_ATTACHMENT_STORAGE_BYTES,
  TASK_ATTACHMENT_MIME_TYPES,
  isAllowedTaskAttachmentMimeType,
  isImageAttachmentMimeType,
} from '@/storage/task-attachment.constants';
import {
  STORAGE_ADAPTER,
  TaskAttachmentUploadFile,
} from '@/storage/storage.types';
import type { StorageAdapter } from '@/storage/storage.types';
import { LocalStorageAdapter } from '@/storage/local-storage.adapter';

type ActivityChange = {
  field: string;
  from: unknown;
  to: unknown;
};

type TaskActivitySnapshot = {
  title: string;
  description: string | null;
  priority: TaskPriority;
  labels: string[];
  dueDate: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  teamId: string | null;
  teamName: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  estimateMinutes: number | null;
  storyPoints: number | null;
  columnId: string;
  columnTitle: string | null;
};

const hasOwn = (value: object, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

const toIsoStringOrNull = (value: Date | string | null | undefined) =>
  value ? new Date(value).toISOString() : null;

const MAX_TASK_ESTIMATE_MINUTES = 100_000;
const MAX_TASK_STORY_POINTS = 1_000;

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(TaskChecklistItem)
    private readonly checklistRepo: Repository<TaskChecklistItem>,
    @InjectRepository(TaskAttachment)
    private readonly attachmentRepo: Repository<TaskAttachment>,
    @InjectRepository(Column)
    private readonly columnRepo: Repository<Column>,
    @InjectRepository(Board)
    private readonly boardRepo: Repository<Board>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    private readonly frontendCache: FrontendCacheService,
    private readonly boardPermissions: BoardPermissionsService,
    private readonly workspacesService: WorkspacesService,
    private readonly boardActivityEvents: BoardActivityEventsService,
    private readonly notificationsService: NotificationsService,
    @Inject(STORAGE_ADAPTER)
    private readonly storage: StorageAdapter,
    private readonly localStorage: LocalStorageAdapter,
  ) {}

  private async verifyColumnWriteAccess(
    columnId: string,
    userId: string,
  ): Promise<Column> {
    const column = await this.columnRepo.findOne({ where: { id: columnId } });
    if (!column) throw new NotFoundException('Column not found');

    await this.boardPermissions.assertCanEditBoardContent(
      column.boardId,
      userId,
    );
    return column;
  }

  private async verifyTaskWriteAccess(
    id: string,
    userId: string,
  ): Promise<Task> {
    const task = await this.taskRepo.findOne({
      where: { id },
      relations: [
        'column',
        'column.board',
        'assignee',
        'team',
        'checklistItems',
        'checklistItems.assignee',
        'attachments',
        'attachments.uploadedBy',
      ],
    });
    if (!task) throw new NotFoundException('Task not found');

    await this.boardPermissions.assertCanEditBoardContent(
      task.column.boardId,
      userId,
    );
    return task;
  }

  private async verifyTaskReadAccess(id: string, userId: string): Promise<Task> {
    const task = await this.taskRepo.findOne({
      where: { id },
      relations: ['column', 'column.board'],
    });
    if (!task) throw new NotFoundException('Task not found');

    await this.boardPermissions.assertCanRead(task.column.boardId, userId);
    return task;
  }

  private async validateAssignee(
    boardId: string,
    assigneeId: string,
  ): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: assigneeId } });
    if (!user) throw new NotFoundException('Assignee not found');

    const board = await this.boardRepo.findOne({
      where: { id: boardId },
      relations: ['members'],
    });
    if (!board) throw new NotFoundException('Board not found');
    try {
      await this.workspacesService.assertMember(
        board.workspaceId,
        assigneeId,
      );
    } catch {
      throw new ForbiddenException(
        'Assignee must belong to the board workspace',
      );
    }
    if (
      board.ownerId !== assigneeId &&
      !board.members?.some((member) => member.userId === assigneeId)
    ) {
      throw new ForbiddenException(
        'Tasks can only be assigned to board members',
      );
    }

    return user;
  }

  private async validateTeam(
    boardId: string,
    teamId: string,
  ): Promise<Team> {
    const board = await this.boardRepo.findOne({
      where: { id: boardId },
      select: { id: true, workspaceId: true },
    });
    if (!board) throw new NotFoundException('Board not found');

    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found');
    if (team.workspaceId !== board.workspaceId) {
      throw new ForbiddenException(
        'Task team must belong to the board workspace',
      );
    }
    return team;
  }

  async create(dto: CreateTaskDto, userId: string): Promise<Task> {
    this.validateTaskNumericFields(dto);
    const column = await this.verifyColumnWriteAccess(dto.columnId, userId);
    let assignee: User | undefined;
    let team: Team | undefined;

    if (dto.assigneeId) {
      assignee = await this.validateAssignee(column.boardId, dto.assigneeId);
      dto.assigneeName = assignee.name;
    }
    if (dto.teamId) {
      team = await this.validateTeam(column.boardId, dto.teamId);
    }
    if (dto.order === undefined) {
      dto.order = await this.taskRepo.count({
        where: { columnId: dto.columnId },
      });
    }

    const task = this.taskRepo.create({
      ...dto,
      assignee,
      team,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      completedAt:
        dto.isCompleted && !dto.completedAt
          ? new Date()
          : dto.completedAt
            ? new Date(dto.completedAt)
            : undefined,
    });
    const saved = await this.taskRepo.save(task);
    await this.frontendCache.revalidateBoard(column.boardId);
    this.notificationsService.emitTaskCreated(column.boardId, saved);
    await this.boardActivityEvents.logTaskCreated(column.boardId, userId, {
      taskId: saved.id,
      title: saved.title,
      columnId: saved.columnId,
      columnTitle: column.title,
      assigneeId: saved.assignee?.id ?? saved.assigneeId ?? null,
      assigneeName: saved.assignee?.name ?? saved.assigneeName ?? null,
      teamId: saved.team?.id ?? saved.teamId ?? null,
      teamName: saved.team?.name ?? null,
    });
    await this.notificationsService.notifyTaskAssigned({
      actorId: userId,
      boardId: column.boardId,
      taskId: saved.id,
      taskTitle: saved.title,
      assigneeId: saved.assignee?.id ?? saved.assigneeId ?? null,
    });
    await this.notificationsService.notifyTeamTaskChanged({
      actorId: userId,
      boardId: column.boardId,
      taskId: saved.id,
      taskTitle: saved.title,
      teamId: saved.team?.id ?? saved.teamId ?? null,
    });
    return this.withPublicAssignee(saved);
  }

  async update(
    id: string,
    dto: UpdateTaskDto,
    userId: string,
    expectedBoardId?: string,
  ): Promise<Task> {
    this.validateTaskNumericFields(dto);
    const task = await this.verifyTaskWriteAccess(id, userId);
    this.assertExpectedBoard(task.column.boardId, expectedBoardId);
    const beforeActivity = this.snapshotTaskActivity(task);
    const { completedAt, dueDate, teamId, ...taskChanges } = dto;
    const wasCompleted = task.isCompleted;
    const sourceOrder = task.order;

    if (dto.assigneeId) {
      const assignee = await this.validateAssignee(
        task.column.boardId,
        dto.assigneeId,
      );
      task.assigneeName = assignee.name;
      task.assignee = assignee;
    }
    if (teamId !== undefined) {
      if (teamId === null) {
        task.teamId = null;
        task.team = null;
      } else {
        const team = await this.validateTeam(task.column.boardId, teamId);
        task.teamId = team.id;
        task.team = team;
      }
    }

    Object.assign(task, taskChanges);
    if (dto.isCompleted === true && !task.completedAt) {
      task.completedAt = completedAt ? new Date(completedAt) : new Date();
    }
    if (dto.isCompleted === false) {
      task.completedAt = null;
    }

    if (dto.isCompleted === true && !wasCompleted) {
      const taskCount = await this.taskRepo.count({
        where: { columnId: task.columnId },
      });
      const lastOrder = Math.max(taskCount - 1, 0);

      if (sourceOrder < lastOrder) {
        await this.taskRepo
          .createQueryBuilder()
          .update(Task)
          .set({ order: () => '"order" - 1' })
          .where(
            '"columnId" = :columnId AND "order" > :sourceOrder AND "order" <= :lastOrder',
            {
              columnId: task.columnId,
              sourceOrder,
              lastOrder,
            },
          )
          .execute();
        task.order = lastOrder;
      }
    }

    if (dueDate !== undefined) {
      task.dueDate = dueDate ? new Date(dueDate) : null;
    }

    const saved = await this.taskRepo.save(task);
    await this.frontendCache.revalidateBoard(task.column.boardId);
    const afterActivity = this.snapshotTaskActivity(saved);
    const changes = this.buildTaskActivityChanges(
      beforeActivity,
      afterActivity,
      dto,
    );

    if (changes.length) {
      const activityPayload = {
        taskId: saved.id,
        title: saved.title,
        columnId: saved.columnId,
        columnTitle: saved.column?.title ?? beforeActivity.columnTitle,
        changes,
      };

      if (!beforeActivity.isCompleted && saved.isCompleted) {
        await this.boardActivityEvents.logTaskCompleted(
          task.column.boardId,
          userId,
          activityPayload,
        );
      } else {
        await this.boardActivityEvents.logTaskUpdated(
          task.column.boardId,
          userId,
          activityPayload,
        );
      }
      if (beforeActivity.assigneeId !== afterActivity.assigneeId) {
        await this.notificationsService.notifyTaskAssigned({
          actorId: userId,
          boardId: task.column.boardId,
          taskId: saved.id,
          taskTitle: saved.title,
          assigneeId: saved.assignee?.id ?? saved.assigneeId ?? null,
        });
      }
      await this.notificationsService.notifyTeamTaskChanged({
        actorId: userId,
        boardId: task.column.boardId,
        taskId: saved.id,
        taskTitle: saved.title,
        teamId: saved.team?.id ?? saved.teamId ?? null,
      });
    }
    return this.withPublicAssignee(saved);
  }

  async remove(id: string, userId: string): Promise<void> {
    const task = await this.verifyTaskWriteAccess(id, userId);
    const boardId = task.column.boardId;
    const activityPayload = {
      taskId: task.id,
      title: task.title,
      columnId: task.columnId,
      columnTitle: task.column?.title ?? null,
    };
    await this.taskRepo.remove(task);
    await this.frontendCache.revalidateBoard(boardId);
    this.notificationsService.emitTaskDeleted(boardId, activityPayload.taskId);
    await this.boardActivityEvents.logTaskDeleted(
      boardId,
      userId,
      activityPayload,
    );
  }

  async move(
    id: string,
    dto: MoveTaskDto,
    userId: string,
    expectedBoardId?: string,
    expectedSourceColumnId?: string,
  ): Promise<Task> {
    const task = await this.verifyTaskWriteAccess(id, userId);
    this.assertExpectedBoard(task.column.boardId, expectedBoardId);
    if (expectedSourceColumnId && task.columnId !== expectedSourceColumnId) {
      throw new ConflictException('Task was moved by another user');
    }
    const sourceColumnId = task.columnId;
    const sourceOrder = task.order;
    const targetColumn = await this.verifyColumnWriteAccess(
      dto.columnId,
      userId,
    );
    if (targetColumn.boardId !== task.column.boardId) {
      throw new BadRequestException(
        'A task cannot be moved to another board',
      );
    }

    if (sourceColumnId === dto.columnId) {
      if (dto.order === sourceOrder) {
        return task;
      }

      if (dto.order < sourceOrder) {
        await this.taskRepo
          .createQueryBuilder()
          .update(Task)
          .set({ order: () => '"order" + 1' })
          .where(
            '"columnId" = :columnId AND "order" >= :startOrder AND "order" < :endOrder',
            {
              columnId: sourceColumnId,
              startOrder: dto.order,
              endOrder: sourceOrder,
            },
          )
          .execute();
      } else {
        await this.taskRepo
          .createQueryBuilder()
          .update(Task)
          .set({ order: () => '"order" - 1' })
          .where(
            '"columnId" = :columnId AND "order" <= :endOrder AND "order" > :startOrder',
            {
              columnId: sourceColumnId,
              startOrder: sourceOrder,
              endOrder: dto.order,
            },
          )
          .execute();
      }
    } else {
      await this.taskRepo
        .createQueryBuilder()
        .update(Task)
        .set({ order: () => '"order" + 1' })
        .where('"columnId" = :columnId AND "order" >= :order', {
          columnId: dto.columnId,
          order: dto.order,
        })
        .execute();
      await this.taskRepo
        .createQueryBuilder()
        .update(Task)
        .set({ order: () => '"order" - 1' })
        .where('"columnId" = :columnId AND "order" > :order', {
          columnId: sourceColumnId,
          order: sourceOrder,
        })
        .execute();
    }

    await this.taskRepo.update(
      { id: task.id },
      { columnId: dto.columnId, order: dto.order },
    );
    const updated = await this.taskRepo.findOne({
      where: { id: task.id },
      relations: ['column', 'column.board', 'assignee', 'team'],
    });
    await this.frontendCache.revalidateBoard(updated.column.boardId);
    await this.boardActivityEvents.logTaskMoved(updated.column.boardId, userId, {
      taskId: updated.id,
      title: updated.title,
      fromColumnId: sourceColumnId,
      fromColumnTitle: task.column?.title ?? null,
      toColumnId: dto.columnId,
      toColumnTitle: targetColumn.title,
      order: dto.order,
    });
    await this.notificationsService.notifyTeamTaskChanged({
      actorId: userId,
      boardId: updated.column.boardId,
      taskId: updated.id,
      taskTitle: updated.title,
      teamId: updated.team?.id ?? updated.teamId ?? null,
    });
    return this.withPublicAssignee(updated);
  }

  async reorder(
    dto: ReorderTasksDto,
    columnId: string,
    userId: string,
    expectedBoardId?: string,
  ): Promise<string> {
    const column = await this.verifyColumnWriteAccess(columnId, userId);
    this.assertExpectedBoard(column.boardId, expectedBoardId);
    await this.assertColumnTaskOrderIsCurrent(columnId, dto.taskIds);
    const updates = dto.taskIds.map((taskId, index) =>
      this.taskRepo.update({ id: taskId, columnId }, { order: index }),
    );
    await Promise.all(updates);
    await this.frontendCache.revalidateBoard(column.boardId);
    await this.boardActivityEvents.logTaskReordered(column.boardId, userId, {
      columnId: column.id,
      columnTitle: column.title,
      taskIds: dto.taskIds,
    });
    return column.boardId;
  }

  async getTaskIdsByColumn(
    columnIds: Array<string | undefined | null>,
  ): Promise<Record<string, string[]>> {
    const uniqueColumnIds = Array.from(
      new Set(columnIds.filter((id): id is string => Boolean(id))),
    );
    if (!uniqueColumnIds.length) return {};

    const tasks = await this.taskRepo.find({
      where: { columnId: In(uniqueColumnIds) },
      select: { id: true, columnId: true, order: true },
      order: { columnId: 'ASC', order: 'ASC', id: 'ASC' },
    });
    const taskIdsByColumn = Object.fromEntries(
      uniqueColumnIds.map((columnId) => [columnId, [] as string[]]),
    );

    for (const task of tasks) {
      taskIdsByColumn[task.columnId]?.push(task.id);
    }

    return taskIdsByColumn;
  }

  private async assertColumnTaskOrderIsCurrent(
    columnId: string,
    taskIds: string[],
  ): Promise<void> {
    const currentTasks = await this.taskRepo.find({
      where: { columnId },
      select: { id: true },
    });
    const currentTaskIds = new Set(currentTasks.map((task) => task.id));
    const hasMissingTask = taskIds.some((taskId) => !currentTaskIds.has(taskId));

    if (hasMissingTask || currentTasks.length !== taskIds.length) {
      throw new ConflictException('Task order is out of date');
    }
  }

  async createChecklistItem(
    taskId: string,
    dto: CreateTaskChecklistItemDto,
    userId: string,
  ): Promise<TaskChecklistItem> {
    const task = await this.verifyTaskWriteAccess(taskId, userId);
    let assignee: User | undefined;

    if (dto.assigneeId) {
      assignee = await this.validateAssignee(task.column.boardId, dto.assigneeId);
    }

    const order =
      dto.order ??
      (await this.checklistRepo.count({
        where: { taskId },
      }));
    const item = this.checklistRepo.create({
      taskId,
      title: dto.title.trim(),
      isDone: dto.isDone ?? false,
      order,
      assigneeId: assignee?.id ?? dto.assigneeId ?? null,
      assigneeName: assignee?.name ?? null,
      assignee,
    });
    const saved = await this.checklistRepo.save(item);
    await this.frontendCache.revalidateBoard(task.column.boardId);
    await this.logTaskDetailChange(task, userId, 'checklist', null, {
      id: saved.id,
      title: saved.title,
      isDone: saved.isDone,
    });

    return this.withPublicChecklistItem(saved);
  }

  async updateChecklistItem(
    taskId: string,
    itemId: string,
    dto: UpdateTaskChecklistItemDto,
    userId: string,
  ): Promise<TaskChecklistItem> {
    const task = await this.verifyTaskWriteAccess(taskId, userId);
    const item = await this.findChecklistItem(taskId, itemId);
    const before = this.snapshotChecklistItem(item);

    if (hasOwn(dto, 'assigneeId')) {
      if (dto.assigneeId) {
        const assignee = await this.validateAssignee(
          task.column.boardId,
          dto.assigneeId,
        );
        item.assigneeId = assignee.id;
        item.assigneeName = assignee.name;
        item.assignee = assignee;
      } else {
        item.assigneeId = null;
        item.assigneeName = null;
        item.assignee = null;
      }
    }
    if (hasOwn(dto, 'title') && dto.title !== undefined) {
      item.title = dto.title.trim();
    }
    if (hasOwn(dto, 'isDone') && dto.isDone !== undefined) {
      item.isDone = dto.isDone;
    }
    if (hasOwn(dto, 'order') && dto.order !== undefined) {
      item.order = dto.order;
    }

    const saved = await this.checklistRepo.save(item);
    await this.frontendCache.revalidateBoard(task.column.boardId);
    await this.logTaskDetailChange(
      task,
      userId,
      'checklist',
      before,
      this.snapshotChecklistItem(saved),
    );

    return this.withPublicChecklistItem(saved);
  }

  async reorderChecklistItems(
    taskId: string,
    dto: ReorderTaskChecklistItemsDto,
    userId: string,
  ): Promise<TaskChecklistItem[]> {
    const task = await this.verifyTaskWriteAccess(taskId, userId);
    const items = await this.checklistRepo.find({
      where: { taskId },
      relations: ['assignee'],
    });
    const itemIds = new Set(items.map((item) => item.id));

    if (dto.itemIds.some((itemId) => !itemIds.has(itemId))) {
      throw new BadRequestException(
        'Checklist items must belong to the task',
      );
    }

    await Promise.all(
      dto.itemIds.map((itemId, order) =>
        this.checklistRepo.update({ id: itemId, taskId }, { order }),
      ),
    );
    await this.frontendCache.revalidateBoard(task.column.boardId);
    await this.logTaskDetailChange(task, userId, 'checklistOrder', null, {
      itemIds: dto.itemIds,
    });

    const reordered = await this.checklistRepo.find({
      where: { taskId },
      relations: ['assignee'],
      order: { order: 'ASC' },
    });

    return reordered.map((item) => this.withPublicChecklistItem(item));
  }

  async removeChecklistItem(
    taskId: string,
    itemId: string,
    userId: string,
  ): Promise<void> {
    const task = await this.verifyTaskWriteAccess(taskId, userId);
    const item = await this.findChecklistItem(taskId, itemId);
    const before = this.snapshotChecklistItem(item);

    await this.checklistRepo.remove(item);
    await this.frontendCache.revalidateBoard(task.column.boardId);
    await this.logTaskDetailChange(task, userId, 'checklist', before, null);
  }

  async uploadAttachment(
    taskId: string,
    file: TaskAttachmentUploadFile | undefined,
    userId: string,
  ): Promise<TaskAttachment> {
    if (!file) {
      throw new BadRequestException('Attachment file is required');
    }
    this.validateTaskAttachment(file);

    const task = await this.verifyTaskWriteAccess(taskId, userId);
    const workspaceId = task.column.board.workspaceId;
    const usedStorage = await this.getWorkspaceAttachmentUsage(workspaceId);

    if (usedStorage + file.size > MAX_WORKSPACE_ATTACHMENT_STORAGE_BYTES) {
      throw new BadRequestException(
        'Workspace attachment storage limit exceeded',
      );
    }

    const stored = await this.storage.uploadAttachment(file, {
      workspaceId,
      boardId: task.column.boardId,
      taskId,
      userId,
    });

    try {
      let attachment = this.attachmentRepo.create({
        taskId,
        fileName: this.normalizeFileName(file.originalname),
        mimeType: file.mimetype,
        size: file.size,
        url: stored.url,
        storageKey: stored.key,
        storageProvider: stored.provider,
        isImage: isImageAttachmentMimeType(file.mimetype),
        uploadedById: userId,
      });

      attachment = await this.attachmentRepo.save(attachment);

      if (attachment.storageProvider === 'local') {
        attachment.url = this.localAttachmentUrl(taskId, attachment.id);
        attachment = await this.attachmentRepo.save(attachment);
      }

      const saved = await this.findAttachment(taskId, attachment.id);
      await this.frontendCache.revalidateBoard(task.column.boardId);
      await this.logTaskDetailChange(task, userId, 'attachment', null, {
        id: saved.id,
        fileName: saved.fileName,
        size: saved.size,
      });

      return this.withPublicAttachment(saved);
    } catch (error) {
      await this.storage.deleteAttachment(stored.key).catch(() => undefined);
      throw error;
    }
  }

  async removeAttachment(
    taskId: string,
    attachmentId: string,
    userId: string,
  ): Promise<void> {
    const task = await this.verifyTaskWriteAccess(taskId, userId);
    const attachment = await this.findAttachment(taskId, attachmentId);

    await this.attachmentRepo.remove(attachment);
    await this.deleteStoredAttachment(attachment);
    await this.frontendCache.revalidateBoard(task.column.boardId);
    await this.logTaskDetailChange(
      task,
      userId,
      'attachment',
      {
        id: attachment.id,
        fileName: attachment.fileName,
        size: attachment.size,
      },
      null,
    );
  }

  async getAttachmentFile(
    taskId: string,
    attachmentId: string,
    userId: string,
  ): Promise<{ buffer: Buffer; contentType: string; fileName: string }> {
    await this.verifyTaskReadAccess(taskId, userId);
    const attachment = await this.findAttachment(taskId, attachmentId);

    if (attachment.storageProvider !== 'local') {
      throw new NotFoundException('Attachment file is not stored locally');
    }

    const file = await this.localStorage.readAttachment(attachment.storageKey);
    return {
      ...file,
      fileName: attachment.fileName,
    };
  }

  private async findChecklistItem(
    taskId: string,
    itemId: string,
  ): Promise<TaskChecklistItem> {
    const item = await this.checklistRepo.findOne({
      where: { id: itemId, taskId },
      relations: ['assignee'],
    });
    if (!item) throw new NotFoundException('Checklist item not found');
    return item;
  }

  private async findAttachment(
    taskId: string,
    attachmentId: string,
  ): Promise<TaskAttachment> {
    const attachment = await this.attachmentRepo.findOne({
      where: { id: attachmentId, taskId },
      relations: ['uploadedBy'],
    });
    if (!attachment) throw new NotFoundException('Attachment not found');
    return attachment;
  }

  private snapshotChecklistItem(item: TaskChecklistItem) {
    return {
      id: item.id,
      title: item.title,
      isDone: item.isDone,
      order: item.order,
      assigneeId: item.assignee?.id ?? item.assigneeId ?? null,
      assigneeName: item.assignee?.name ?? item.assigneeName ?? null,
    };
  }

  private async logTaskDetailChange(
    task: Task,
    userId: string,
    field: string,
    from: unknown,
    to: unknown,
  ) {
    await this.boardActivityEvents.logTaskUpdated(task.column.boardId, userId, {
      taskId: task.id,
      title: task.title,
      columnId: task.columnId,
      columnTitle: task.column?.title ?? null,
      changes: [{ field, from, to }],
    });
  }

  private validateTaskAttachment(file: TaskAttachmentUploadFile) {
    if (file.size > MAX_TASK_ATTACHMENT_SIZE_BYTES) {
      throw new BadRequestException(
        'Attachment file must not exceed 10 MB',
      );
    }
    if (!isAllowedTaskAttachmentMimeType(file.mimetype)) {
      throw new BadRequestException(
        `Attachments must use one of these MIME types: ${TASK_ATTACHMENT_MIME_TYPES.join(', ')}`,
      );
    }
  }

  private validateTaskNumericFields(dto: CreateTaskDto | UpdateTaskDto) {
    if (hasOwn(dto, 'estimateMinutes')) {
      this.validateTaskIntegerRange(
        dto.estimateMinutes,
        'Estimate',
        MAX_TASK_ESTIMATE_MINUTES,
      );
    }
    if (hasOwn(dto, 'storyPoints')) {
      this.validateTaskIntegerRange(
        dto.storyPoints,
        'Story points',
        MAX_TASK_STORY_POINTS,
      );
    }
  }

  private validateTaskIntegerRange(
    value: unknown,
    label: string,
    max: number,
  ) {
    if (value === undefined || value === null) return;
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      !Number.isInteger(value)
    ) {
      throw new BadRequestException(`${label} must be an integer`);
    }
    if (value < 0 || value > max) {
      throw new BadRequestException(`${label} must be between 0 and ${max}`);
    }
  }

  private async getWorkspaceAttachmentUsage(
    workspaceId: string,
  ): Promise<number> {
    const result = await this.attachmentRepo
      .createQueryBuilder('attachment')
      .innerJoin('attachment.task', 'task')
      .innerJoin('task.column', 'column')
      .innerJoin('column.board', 'board')
      .where('board.workspaceId = :workspaceId', { workspaceId })
      .select('COALESCE(SUM(attachment.size), 0)', 'total')
      .getRawOne<{ total: string | number | null }>();

    return Number(result?.total ?? 0);
  }

  private async deleteStoredAttachment(attachment: TaskAttachment) {
    if (attachment.storageProvider === this.storage.provider) {
      await this.storage
        .deleteAttachment(attachment.storageKey)
        .catch(() => undefined);
      return;
    }

    if (attachment.storageProvider === 'local') {
      await this.localStorage
        .deleteAttachment(attachment.storageKey)
        .catch(() => undefined);
    }
  }

  private normalizeFileName(fileName: string) {
    const normalized = fileName.split(/[\\/]/).pop()?.trim() || 'attachment';
    return normalized.slice(0, 255);
  }

  private localAttachmentUrl(taskId: string, attachmentId: string) {
    return `/api/tasks/${taskId}/attachments/${attachmentId}/file`;
  }

  private withPublicChecklistItem(
    item: TaskChecklistItem,
  ): TaskChecklistItem {
    if (item.assignee) item.assignee = toPublicUser(item.assignee);
    return item;
  }

  private withPublicAttachment(attachment: TaskAttachment): TaskAttachment {
    if (attachment.uploadedBy) {
      attachment.uploadedBy = toPublicUser(attachment.uploadedBy);
    }
    return attachment;
  }

  private snapshotTaskActivity(task: Task): TaskActivitySnapshot {
    return {
      title: task.title,
      description: task.description ?? null,
      priority: task.priority,
      labels: task.labels ?? [],
      dueDate: toIsoStringOrNull(task.dueDate),
      assigneeId: task.assignee?.id ?? task.assigneeId ?? null,
      assigneeName: task.assignee?.name ?? task.assigneeName ?? null,
      teamId: task.team?.id ?? task.teamId ?? null,
      teamName: task.team?.name ?? null,
      isCompleted: task.isCompleted,
      completedAt: toIsoStringOrNull(task.completedAt),
      estimateMinutes: task.estimateMinutes ?? null,
      storyPoints: task.storyPoints ?? null,
      columnId: task.columnId,
      columnTitle: task.column?.title ?? null,
    };
  }

  private buildTaskActivityChanges(
    before: TaskActivitySnapshot,
    after: TaskActivitySnapshot,
    dto: UpdateTaskDto,
  ): ActivityChange[] {
    const changes: ActivityChange[] = [];

    if (hasOwn(dto, 'title')) {
      this.addActivityChange(changes, 'title', before.title, after.title);
    }
    if (hasOwn(dto, 'description')) {
      this.addActivityChange(
        changes,
        'description',
        before.description,
        after.description,
      );
    }
    if (hasOwn(dto, 'priority')) {
      this.addActivityChange(
        changes,
        'priority',
        before.priority,
        after.priority,
      );
    }
    if (hasOwn(dto, 'labels')) {
      this.addActivityChange(changes, 'labels', before.labels, after.labels);
    }
    if (hasOwn(dto, 'dueDate')) {
      this.addActivityChange(changes, 'dueDate', before.dueDate, after.dueDate);
    }
    if (hasOwn(dto, 'assigneeId')) {
      this.addActivityChange(
        changes,
        'assignee',
        { id: before.assigneeId, name: before.assigneeName },
        { id: after.assigneeId, name: after.assigneeName },
      );
    }
    if (hasOwn(dto, 'teamId')) {
      this.addActivityChange(
        changes,
        'team',
        { id: before.teamId, name: before.teamName },
        { id: after.teamId, name: after.teamName },
      );
    }
    if (hasOwn(dto, 'isCompleted')) {
      this.addActivityChange(
        changes,
        'isCompleted',
        before.isCompleted,
        after.isCompleted,
      );
    }
    if (hasOwn(dto, 'completedAt')) {
      this.addActivityChange(
        changes,
        'completedAt',
        before.completedAt,
        after.completedAt,
      );
    }
    if (hasOwn(dto, 'estimateMinutes')) {
      this.addActivityChange(
        changes,
        'estimateMinutes',
        before.estimateMinutes,
        after.estimateMinutes,
      );
    }
    if (hasOwn(dto, 'storyPoints')) {
      this.addActivityChange(
        changes,
        'storyPoints',
        before.storyPoints,
        after.storyPoints,
      );
    }

    return changes;
  }

  private addActivityChange(
    changes: ActivityChange[],
    field: string,
    from: unknown,
    to: unknown,
  ) {
    if (JSON.stringify(from) === JSON.stringify(to)) return;
    changes.push({ field, from, to });
  }

  private buildCompletionAnalyticsQuery(
    userId: string,
    query: AnalyticsQueryDto,
  ): SelectQueryBuilder<Task> {
    const qb = this.taskRepo
      .createQueryBuilder('task')
      .innerJoin('task.column', 'column')
      .innerJoin('column.board', 'board')
      .leftJoin('board.members', 'member', 'member.userId = :userId', {
        userId,
      })
      .where('task.isCompleted = true')
      .andWhere('task.completedAt IS NOT NULL')
      .andWhere('(board.ownerId = :userId OR member.userId = :userId)', {
        userId,
      });

    if (query.boardId) {
      qb.andWhere('board.id = :boardId', { boardId: query.boardId });
    }
    if (query.fromDate) {
      qb.andWhere('task.completedAt >= :fromDate', {
        fromDate: new Date(query.fromDate),
      });
    }
    if (query.toDate) {
      qb.andWhere('task.completedAt <= :toDate', {
        toDate: new Date(query.toDate),
      });
    }

    return qb;
  }

  private withPublicAssignee(task: Task): Task {
    if (task?.assignee) {
      task.assignee = toPublicUser(task.assignee);
    }
    task?.checklistItems?.forEach((item) => {
      if (item.assignee) item.assignee = toPublicUser(item.assignee);
    });
    task?.checklistItems?.sort((a, b) => a.order - b.order);
    task?.attachments?.forEach((attachment) => {
      if (attachment.uploadedBy) {
        attachment.uploadedBy = toPublicUser(attachment.uploadedBy);
      }
    });
    task?.attachments?.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return task;
  }

  private assertExpectedBoard(
    actualBoardId: string,
    expectedBoardId?: string,
  ): void {
    if (expectedBoardId && actualBoardId !== expectedBoardId) {
      throw new BadRequestException('Resource does not belong to this board');
    }
  }

  async getDailyAnalytics(
    userId: string,
    query: AnalyticsQueryDto,
  ): Promise<{ period: string; count: number }[]> {
    const raw = await this.buildCompletionAnalyticsQuery(userId, query)
      .select(
        "TO_CHAR(DATE_TRUNC('day', task.completedAt), 'YYYY-MM-DD')",
        'period',
      )
      .addSelect('COUNT(*)', 'count')
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany();

    return raw.map((item) => ({
      period: item.period,
      count: Number(item.count) || 0,
    }));
  }

  async getWeeklyAnalytics(
    userId: string,
    query: AnalyticsQueryDto,
  ): Promise<{ period: string; count: number }[]> {
    const raw = await this.buildCompletionAnalyticsQuery(userId, query)
      .select(
        "TO_CHAR(DATE_TRUNC('week', task.completedAt), 'YYYY-MM-DD')",
        'period',
      )
      .addSelect('COUNT(*)', 'count')
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany();

    return raw.map((item) => ({
      period: item.period,
      count: Number(item.count) || 0,
    }));
  }

  async getMonthlyAnalytics(
    userId: string,
    query: AnalyticsQueryDto,
  ): Promise<{ period: string; count: number }[]> {
    const raw = await this.buildCompletionAnalyticsQuery(userId, query)
      .select(
        "TO_CHAR(DATE_TRUNC('month', task.completedAt), 'YYYY-MM')",
        'period',
      )
      .addSelect('COUNT(*)', 'count')
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany();

    return raw.map((item) => ({
      period: item.period,
      count: Number(item.count) || 0,
    }));
  }

  async getCompletionSummary(
    userId: string,
    query: AnalyticsQueryDto,
  ): Promise<{ total: number; onTime: number; late: number }> {
    const summary = await this.buildCompletionAnalyticsQuery(userId, query)
      .select('COUNT(*)', 'total')
      .addSelect(
        'SUM(CASE WHEN task.dueDate IS NULL OR task.completedAt <= task.dueDate THEN 1 ELSE 0 END)',
        'onTime',
      )
      .addSelect(
        'SUM(CASE WHEN task.dueDate IS NOT NULL AND task.completedAt > task.dueDate THEN 1 ELSE 0 END)',
        'late',
      )
      .getRawOne();

    return {
      total: Number(summary.total) || 0,
      onTime: Number(summary.onTime) || 0,
      late: Number(summary.late) || 0,
    };
  }
}
