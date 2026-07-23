import { BoardView } from '@/boards/entities/board-view.entity';
import { BoardMember } from '@/boards/entities/board-member.entity';
import { BoardRole } from '@/boards/entities/board-role.enum';
import { Board } from '@/boards/entities/board.entity';
import { Column } from '@/columns/entities/column.entity';
import { Task, TaskPriority } from '@/tasks/entities/task.entity';
import { TeamMember } from '@/teams/entities/team-member.entity';
import { Team } from '@/teams/entities/team.entity';
import { User } from '@/users/entities/user.entity';
import { AppLocale } from '@/common/locale/request-locale';
import {
  WorkspaceInviteAuditEvent,
  WorkspaceInviteAuditEventType,
} from '@/workspaces/entities/workspace-invite-audit-event.entity';
import { WorkspaceInvite } from '@/workspaces/entities/workspace-invite.entity';
import { WorkspaceMember } from '@/workspaces/entities/workspace-member.entity';
import { WorkspaceRole } from '@/workspaces/entities/workspace-role.enum';
import { Workspace } from '@/workspaces/entities/workspace.entity';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import { TaskComment } from '@/notifications/entities/task-comment.entity';

interface DemoUserSpec {
  email: string;
  name: string;
  teamKeys: string[];
  workspaceRole?: WorkspaceRole.ADMIN | WorkspaceRole.MEMBER;
}

interface DemoTeamSpec {
  key: string;
  name: string;
  description: string;
  color: string;
}

interface DemoBoardSpec {
  key: string;
  title: string;
  description: string;
  color: string;
  columns: string[];
  labels: string[];
}

interface DemoWorkspaceSession {
  user: User;
  workspaceId: string;
  boardId: string;
}

export type DemoTaskTimingCategory =
  | 'completedOnTime'
  | 'completedLate'
  | 'openOverdue'
  | 'dueSoon'
  | 'future'
  | 'withoutDeadline';

export interface DemoTaskAnalyticsSeed {
  category: DemoTaskTimingCategory;
  isCompleted: boolean;
  completedAt: Date | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  estimateMinutes: number | null;
  storyPoints: number | null;
}

const addDaysAtNoon = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  next.setHours(12, 0, 0, 0);
  return next;
};

export const buildDemoTaskAnalyticsSeed = (
  index: number,
  isDoneColumn: boolean,
  now: Date,
): DemoTaskAnalyticsSeed => {
  const isCompleted = isDoneColumn || index % 10 === 0;
  const estimateMinutes =
    index % 6 === 0 ? null : [30, 60, 90, 120, 180, 240, 480][index % 7];
  const storyPoints = index % 5 === 0 ? null : [1, 2, 3, 5, 8, 13][index % 6];

  if (isCompleted) {
    const completedAt = addDaysAtNoon(now, -((index * 7) % 90) - 1);
    const isLate = index % 2 === 1;
    const dueDelta = (index % 4) + 1;
    return {
      category: isLate ? 'completedLate' : 'completedOnTime',
      isCompleted: true,
      completedAt,
      dueDate: addDaysAtNoon(completedAt, isLate ? -dueDelta : dueDelta),
      createdAt: addDaysAtNoon(completedAt, -((index % 18) + 3)),
      updatedAt: completedAt,
      estimateMinutes,
      storyPoints,
    };
  }

  const openCategory = index % 5;
  const createdAt = addDaysAtNoon(now, -((index % 60) + 2));
  if (openCategory === 0) {
    return {
      category: 'withoutDeadline',
      isCompleted: false,
      completedAt: null,
      dueDate: null,
      createdAt,
      updatedAt: addDaysAtNoon(now, -(index % 4)),
      estimateMinutes,
      storyPoints,
    };
  }

  if (openCategory === 1) {
    return {
      category: 'openOverdue',
      isCompleted: false,
      completedAt: null,
      dueDate: addDaysAtNoon(now, -((index % 14) + 1)),
      createdAt,
      updatedAt: addDaysAtNoon(now, -(index % 4)),
      estimateMinutes,
      storyPoints,
    };
  }

  if (openCategory === 2) {
    return {
      category: 'dueSoon',
      isCompleted: false,
      completedAt: null,
      dueDate: addDaysAtNoon(now, (index % 7) + 1),
      createdAt,
      updatedAt: addDaysAtNoon(now, -(index % 4)),
      estimateMinutes,
      storyPoints,
    };
  }

  return {
    category: 'future',
    isCompleted: false,
    completedAt: null,
    dueDate: addDaysAtNoon(now, (index % 38) + 8),
    createdAt,
    updatedAt: addDaysAtNoon(now, -(index % 4)),
    estimateMinutes,
    storyPoints,
  };
};

const DEMO_OWNER_EMAIL = 'demo-owner@taskflow.local';
const DEMO_OWNER_NAMES: Record<AppLocale, string> = {
  en: 'TaskFlow Demo Owner',
  ru: 'TaskFlow Demo Owner',
};

const DEMO_USERS: DemoUserSpec[] = [
  {
    email: 'alex.dev@taskflow.local',
    name: 'Alex Developer',
    teamKeys: ['dev'],
    workspaceRole: WorkspaceRole.ADMIN,
  },
  {
    email: 'maria.design@taskflow.local',
    name: 'Maria Designer',
    teamKeys: ['design'],
    workspaceRole: WorkspaceRole.ADMIN,
  },
  {
    email: 'ivan.qa@taskflow.local',
    name: 'Ivan QA',
    teamKeys: ['qa'],
  },
  {
    email: 'nina.pm@taskflow.local',
    name: 'Nina Product',
    teamKeys: ['management'],
  },
  {
    email: 'sam.backend@taskflow.local',
    name: 'Sam Backend',
    teamKeys: ['dev'],
  },
  {
    email: 'olga.frontend@taskflow.local',
    name: 'Olga Frontend',
    teamKeys: ['dev'],
  },
  {
    email: 'lee.mobile@taskflow.local',
    name: 'Lee Mobile',
    teamKeys: ['dev', 'qa'],
  },
  {
    email: 'eva.research@taskflow.local',
    name: 'Eva Research',
    teamKeys: ['design', 'management'],
  },
  {
    email: 'max.support@taskflow.local',
    name: 'Max Support',
    teamKeys: ['support'],
  },
  {
    email: 'kate.ops@taskflow.local',
    name: 'Kate Operations',
    teamKeys: ['support', 'qa'],
  },
  {
    email: 'dmitry.marketing@taskflow.local',
    name: 'Dmitry Marketing',
    teamKeys: ['support', 'management'],
  },
  {
    email: 'sofia.qa@taskflow.local',
    name: 'Sofia QA',
    teamKeys: ['qa'],
  },
];

const DEMO_USER_NAMES_RU: Record<string, string> = {
  'alex.dev@taskflow.local': 'Алексей Developer',
  'maria.design@taskflow.local': 'Мария Designer',
  'ivan.qa@taskflow.local': 'Иван QA',
  'nina.pm@taskflow.local': 'Нина Product',
  'sam.backend@taskflow.local': 'Сергей Backend',
  'olga.frontend@taskflow.local': 'Ольга Frontend',
  'lee.mobile@taskflow.local': 'Леонид Mobile',
  'eva.research@taskflow.local': 'Ева Research',
  'max.support@taskflow.local': 'Максим Support',
  'kate.ops@taskflow.local': 'Катя Operations',
  'dmitry.marketing@taskflow.local': 'Дмитрий Marketing',
  'sofia.qa@taskflow.local': 'София QA',
};

const DEMO_COMMENTS: Record<AppLocale, string[]> = {
  en: [
    'Acceptance criteria checked. The task is ready for the next stage.',
    'Added context from the latest team review and updated the edge cases.',
    'Please verify this on mobile and desktop before the release window.',
    'Analytics and delivery signals now match the expected scenario.',
    'Follow-up is documented; no additional blockers were found.',
  ],
  ru: [
    'Критерии приёмки проверены. Задача готова к следующему этапу.',
    'Добавлен контекст последнего командного ревью и уточнены крайние случаи.',
    'Пожалуйста, проверьте это на мобильном и desktop перед релизом.',
    'Метрики аналитики и delivery-сигналы соответствуют ожидаемому сценарию.',
    'Follow-up зафиксирован, дополнительных блокеров не найдено.',
  ],
};

interface DemoCommentTaskSeed {
  id: string;
  boardId: string;
  createdAt: Date;
  completedAt?: Date | null;
}

export const buildDemoTaskCommentSeeds = (
  tasks: DemoCommentTaskSeed[],
  users: Array<Pick<User, 'id'>>,
  locale: AppLocale,
) => {
  if (!users.length) return [];

  return tasks.flatMap((task, index) => {
    if (index % 4 !== 0) return [];
    const count = index % 12 === 0 ? 2 : 1;

    return Array.from({ length: count }, (_, commentIndex) => {
      const createdAt = addDaysAtNoon(
        task.completedAt ?? task.createdAt,
        commentIndex === 0 ? 1 : 2,
      );
      return {
        taskId: task.id,
        boardId: task.boardId,
        authorId: users[(index + commentIndex + 2) % users.length].id,
        body: DEMO_COMMENTS[locale][
          (index + commentIndex) % DEMO_COMMENTS[locale].length
        ],
        createdAt,
        updatedAt: createdAt,
      };
    });
  });
};

const DEMO_TEXT: Record<
  AppLocale,
  {
    workspaceName: string;
    teams: DemoTeamSpec[];
    boards: DemoBoardSpec[];
    taskVerbs: string[];
    taskObjects: string[];
    savedViews: {
      urgent: string;
      overdue: string;
      design: string;
    };
  }
> = {
  en: {
    workspaceName: 'TaskFlow Showcase Workspace',
    teams: [
      {
        key: 'dev',
        name: 'Developers',
        description: 'Frontend, backend, realtime, and platform work.',
        color: '#2563eb',
      },
      {
        key: 'design',
        name: 'Design',
        description: 'Product design, UX review, and usability polish.',
        color: '#db2777',
      },
      {
        key: 'management',
        name: 'Management',
        description: 'Roadmap, priorities, delivery, and stakeholder context.',
        color: '#7c3aed',
      },
      {
        key: 'qa',
        name: 'QA',
        description:
          'Regression checks, acceptance criteria, and release quality.',
        color: '#0f766e',
      },
      {
        key: 'support',
        name: 'Support',
        description: 'Customer feedback, incidents, and operational follow-up.',
        color: '#f97316',
      },
    ],
    boards: [
      {
        key: 'roadmap',
        title: 'Product Roadmap',
        description:
          'Quarterly initiatives, discovery, launch planning, and risk tracking.',
        color: '#7c3aed',
        columns: ['Ideas', 'Discovery', 'Planned', 'In Progress', 'Shipped'],
        labels: ['roadmap', 'growth', 'research', 'launch', 'risk'],
      },
      {
        key: 'sprint',
        title: 'Sprint Board',
        description:
          'Current engineering sprint with ownership, priority, and delivery signals.',
        color: '#2563eb',
        columns: ['Backlog', 'Ready', 'In Progress', 'Review', 'Done'],
        labels: ['frontend', 'backend', 'realtime', 'permissions', 'filters'],
      },
      {
        key: 'design',
        title: 'Design Review',
        description: 'UX polish, mobile layouts, design QA, and handoff tasks.',
        color: '#db2777',
        columns: ['Requests', 'Exploration', 'Prototype', 'Review', 'Approved'],
        labels: ['ux', 'mobile', 'a11y', 'handoff', 'research'],
      },
      {
        key: 'hiring',
        title: 'Hiring Pipeline',
        description:
          'Portfolio review workflow for leads, trial tasks, and interview stages.',
        color: '#0f766e',
        columns: ['Sourced', 'Screening', 'Interview', 'Offer', 'Hired'],
        labels: ['people', 'interview', 'portfolio', 'coordination', 'offer'],
      },
      {
        key: 'support',
        title: 'Support Bugs',
        description:
          'Customer-facing bugs, triage, SLA work, and follow-up tasks.',
        color: '#f97316',
        columns: ['Inbox', 'Triaged', 'Fixing', 'Verify', 'Closed'],
        labels: ['bug', 'customer', 'incident', 'sla', 'regression'],
      },
    ],
    taskVerbs: [
      'Prepare',
      'Review',
      'Ship',
      'Validate',
      'Document',
      'Refine',
      'Audit',
      'Coordinate',
      'Prototype',
      'Stabilize',
    ],
    taskObjects: [
      'workspace permissions',
      'saved view presets',
      'mobile filters drawer',
      'team assignment flow',
      'realtime board sync',
      'demo analytics story',
      'role-based empty states',
      'invite acceptance path',
      'task detail polish',
      'release checklist',
    ],
    savedViews: {
      urgent: 'My urgent work',
      overdue: 'Overdue customer issues',
      design: 'Design team review',
    },
  },
  ru: {
    workspaceName: 'Демонстрационное пространство TaskFlow',
    teams: [
      {
        key: 'dev',
        name: 'Frontend / Backend',
        description: 'Frontend, backend, realtime и platform work.',
        color: '#2563eb',
      },
      {
        key: 'design',
        name: 'Design',
        description: 'Product design, UX review, дизайн QA и handoff.',
        color: '#db2777',
      },
      {
        key: 'management',
        name: 'Product',
        description:
          'Роадмап, приоритеты, delivery и контекст для стейкхолдеров.',
        color: '#7c3aed',
      },
      {
        key: 'qa',
        name: 'QA',
        description: 'Регресс, acceptance criteria и контроль релиза.',
        color: '#0f766e',
      },
      {
        key: 'support',
        name: 'Support',
        description: 'Customer feedback, инциденты, SLA и follow-up.',
        color: '#f97316',
      },
    ],
    boards: [
      {
        key: 'roadmap',
        title: 'Roadmap продукта',
        description:
          'Квартальные инициативы, discovery, launch planning и отслеживание рисков.',
        color: '#7c3aed',
        columns: [
          'Идеи',
          'Исследование',
          'Запланировано',
          'В работе',
          'Выпущено',
        ],
        labels: ['roadmap', 'growth', 'research', 'launch', 'risk'],
      },
      {
        key: 'sprint',
        title: 'Спринт',
        description:
          'Текущий engineering sprint с владельцами, приоритетами и delivery сигналами.',
        color: '#2563eb',
        columns: ['Бэклог', 'Готово', 'В работе', 'Review', 'Выполнено'],
        labels: ['frontend', 'backend', 'realtime', 'permissions', 'filters'],
      },
      {
        key: 'design',
        title: 'Дизайн Review',
        description:
          'UX polish, mobile layouts, дизайн QA и задачи на handoff.',
        color: '#db2777',
        columns: [
          'Запросы',
          'Исследование',
          'Прототип',
          'Review',
          'Подтверждено',
        ],
        labels: ['ux', 'mobile', 'a11y', 'handoff', 'research'],
      },
      {
        key: 'hiring',
        title: 'Пайплайн найма',
        description: 'Пайплайн кандидатов: портфолио, trial task и интервью.',
        color: '#0f766e',
        columns: [
          'Поиск кандидатов',
          'Скрининг',
          'Собеседование',
          'Оффер',
          'Наняты',
        ],
        labels: ['people', 'interview', 'portfolio', 'coordination', 'offer'],
      },
      {
        key: 'support',
        title: 'Support баги',
        description: 'Customer-facing bugs, triage, SLA и follow-up задачи.',
        color: '#f97316',
        columns: [
          'Входящие',
          'Распределено',
          'В работе',
          'Проверка',
          'Закрыто',
        ],
        labels: ['bug', 'customer', 'incident', 'sla', 'regression'],
      },
    ],
    taskVerbs: [
      'Подготовить',
      'Проверить',
      'Зарелизить',
      'Провалидировать',
      'Описать',
      'Доработать',
      'Проаудировать',
      'Скоординировать',
      'Собрать прототип',
      'Стабилизировать',
    ],
    taskObjects: [
      'workspace permissions',
      'saved view presets',
      'mobile filters drawer',
      'team assignment flow',
      'realtime board sync',
      'demo analytics story',
      'role-based empty states',
      'invite acceptance path',
      'task detail polish',
      'release checklist',
    ],
    savedViews: {
      urgent: 'Мои срочные задачи',
      overdue: 'Просроченные customer issues',
      design: 'Design review команды',
    },
  },
};

@Injectable()
export class DemoService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  async startDemoSession(
    locale: AppLocale = 'en',
  ): Promise<DemoWorkspaceSession> {
    this.assertDemoEnabled();
    return this.seedSharedDemoWorkspace(locale);
  }

  async resetDemoWorkspace(
    userId: string,
    locale: AppLocale = 'en',
  ): Promise<DemoWorkspaceSession> {
    this.assertDemoEnabled();
    const user = await this.dataSource.getRepository(User).findOne({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.email !== this.demoOwnerEmail) {
      throw new ForbiddenException('Only the demo owner can reset demo data');
    }

    return this.seedSharedDemoWorkspace(locale);
  }

  async seedSharedDemoWorkspace(
    locale: AppLocale = 'en',
  ): Promise<DemoWorkspaceSession> {
    this.assertDemoEnabled();

    return this.dataSource.transaction(async (manager) => {
      const demoText = this.getDemoText(locale);
      const owner = await this.upsertDemoOwner(manager, locale);
      const demoUsers = await this.upsertDemoUsers(manager, locale);

      await manager.getRepository(Workspace).delete({ isDemoInstance: true });
      await manager.getRepository(Workspace).delete({ isDemoTemplate: true });

      const workspace = await manager.getRepository(Workspace).save(
        manager.getRepository(Workspace).create({
          name: demoText.workspaceName,
          ownerId: owner.id,
          isPersonal: false,
          isDemoTemplate: true,
          isDemoInstance: false,
          demoExpiresAt: null,
          demoSourceWorkspaceId: null,
        }),
      );

      await this.createWorkspaceMemberships(
        manager,
        workspace.id,
        owner,
        demoUsers,
      );
      const teams = await this.createTeams(
        manager,
        workspace.id,
        owner.id,
        locale,
      );
      await this.createTeamMemberships(manager, teams, owner, demoUsers);
      const boards = await this.createBoards(
        manager,
        workspace.id,
        owner.id,
        locale,
      );
      await this.createBoardAccess(manager, boards, owner.id, demoUsers);
      await this.createTasks(manager, boards, teams, owner, demoUsers, locale);
      await this.createSavedViews(manager, boards, teams, owner.id, locale);

      await manager.getRepository(User).update(owner.id, {
        activeWorkspaceId: workspace.id,
      });
      owner.activeWorkspaceId = workspace.id;

      return {
        user: owner,
        workspaceId: workspace.id,
        boardId: boards[1]?.id ?? boards[0].id,
      };
    });
  }

  async registerDemoInviteGuest(
    token: string,
    locale: AppLocale = 'en',
  ): Promise<DemoWorkspaceSession> {
    this.assertDemoEnabled();

    return this.dataSource.transaction(async (manager) => {
      const inviteRepo = manager.getRepository(WorkspaceInvite);
      const memberRepo = manager.getRepository(WorkspaceMember);
      const auditRepo = manager.getRepository(WorkspaceInviteAuditEvent);
      const userRepo = manager.getRepository(User);

      const invite = await inviteRepo
        .createQueryBuilder('invite')
        .innerJoinAndSelect('invite.workspace', 'workspace')
        .innerJoinAndSelect('invite.createdBy', 'createdBy')
        .setLock('pessimistic_write', undefined, ['invite'])
        .where('invite.tokenHash = :tokenHash', {
          tokenHash: this.hashToken(token),
        })
        .getOne();
      if (!invite) throw new NotFoundException('Workspace invite not found');

      this.assertInviteIsUsable(invite);
      if (!this.isDemoInvite(invite)) {
        throw new NotFoundException('Demo invite registration is unavailable');
      }

      const user = await this.createDemoInviteGuest(manager, locale);
      this.assertEmailAllowed(invite, user.email);

      await memberRepo.save(
        memberRepo.create({
          workspaceId: invite.workspaceId,
          userId: user.id,
          role: invite.defaultRole,
        }),
      );
      invite.usesCount += 1;
      await inviteRepo.save(invite);
      await auditRepo.save(
        auditRepo.create({
          workspaceId: invite.workspaceId,
          inviteId: invite.id,
          actorUserId: user.id,
          event: WorkspaceInviteAuditEventType.ACCEPTED,
          metadata: {
            assignedRole: invite.defaultRole,
            source: 'demo-instant-registration',
          },
        }),
      );

      await userRepo.update(user.id, {
        activeWorkspaceId: invite.workspaceId,
      });
      user.activeWorkspaceId = invite.workspaceId;

      return {
        user,
        workspaceId: invite.workspaceId,
        boardId: await this.getDemoStartBoardId(
          manager,
          invite.workspaceId,
          locale,
        ),
      };
    });
  }

  private get demoOwnerEmail() {
    return this.config.get<string>('DEMO_OWNER_EMAIL') ?? DEMO_OWNER_EMAIL;
  }

  private assertDemoEnabled() {
    if (this.config.get<string>('ENABLE_DEMO_MODE') !== 'true') {
      throw new NotFoundException('Demo mode is disabled');
    }
  }

  private getDemoText(locale: AppLocale) {
    return DEMO_TEXT[locale] ?? DEMO_TEXT.en;
  }

  private assertInviteIsUsable(invite: WorkspaceInvite): void {
    if (
      invite.revokedAt ||
      invite.expiresAt.getTime() <= Date.now() ||
      (invite.maxUses !== null && invite.usesCount >= invite.maxUses)
    ) {
      throw new NotFoundException('Workspace invite is no longer available');
    }
  }

  private assertEmailAllowed(invite: WorkspaceInvite, email: string): void {
    const normalizedEmail = email.trim().toLowerCase();
    if (invite.allowedEmail && invite.allowedEmail !== normalizedEmail) {
      throw new ForbiddenException(
        'This invite is restricted to another email address',
      );
    }
    if (
      invite.allowedEmailDomain &&
      !normalizedEmail.endsWith(`@${invite.allowedEmailDomain}`)
    ) {
      throw new ForbiddenException(
        'Your email domain is not allowed by this invite',
      );
    }
  }

  private isDemoInvite(invite: WorkspaceInvite): boolean {
    return Boolean(
      invite.workspace?.isDemoTemplate ||
      invite.workspace?.isDemoInstance ||
      invite.createdBy?.email === this.demoOwnerEmail,
    );
  }

  private async createDemoInviteGuest(
    manager: EntityManager,
    locale: AppLocale,
  ): Promise<User> {
    const userRepo = manager.getRepository(User);
    const seed = `demo-guest-${randomBytes(6).toString('hex')}`;
    const email = `${seed}@taskflow.local`;
    const name = locale === 'ru' ? 'Demo Guest' : 'Demo Guest';

    return userRepo.save(
      userRepo.create({
        email,
        name,
        password: randomBytes(24).toString('base64url'),
        avatar: this.getAvatarUrl(email),
        avatarProvider: 'dicebear',
        avatarStorageKey: email,
      }),
    );
  }

  private async getDemoStartBoardId(
    manager: EntityManager,
    workspaceId: string,
    locale: AppLocale,
  ): Promise<string> {
    const boards = await manager.getRepository(Board).find({
      where: { workspaceId },
      order: { createdAt: 'ASC' },
    });
    const sprintTitle = this.getDemoText(locale).boards.find(
      (board) => board.key === 'sprint',
    )?.title;
    const sprint = boards.find(
      (board) => board.title === sprintTitle || board.title === 'Sprint Board',
    );
    const boardId = sprint?.id ?? boards[0]?.id;
    if (!boardId) throw new NotFoundException('Demo board not found');
    return boardId;
  }

  private async upsertDemoOwner(
    manager: EntityManager,
    locale: AppLocale,
  ): Promise<User> {
    return this.upsertDemoUser(manager, {
      email: this.demoOwnerEmail,
      name: DEMO_OWNER_NAMES[locale],
      teamKeys: ['management', 'dev', 'design'],
      workspaceRole: WorkspaceRole.ADMIN,
    });
  }

  private async upsertDemoUsers(
    manager: EntityManager,
    locale: AppLocale,
  ): Promise<User[]> {
    const users: User[] = [];
    for (const spec of DEMO_USERS) {
      users.push(
        await this.upsertDemoUser(
          manager,
          this.localizeDemoUserSpec(spec, locale),
        ),
      );
    }
    return users;
  }

  private localizeDemoUserSpec(
    spec: DemoUserSpec,
    locale: AppLocale,
  ): DemoUserSpec {
    if (locale !== 'ru') return spec;
    return {
      ...spec,
      name: DEMO_USER_NAMES_RU[spec.email] ?? spec.name,
    };
  }

  private async upsertDemoUser(
    manager: EntityManager,
    spec: DemoUserSpec,
  ): Promise<User> {
    const userRepo = manager.getRepository(User);
    const existing = await userRepo.findOne({ where: { email: spec.email } });
    const avatar = this.getAvatarUrl(spec.email);

    if (existing) {
      existing.name = spec.name;
      existing.avatar = avatar;
      existing.avatarProvider = 'dicebear';
      existing.avatarStorageKey = spec.email;
      return userRepo.save(existing);
    }

    return userRepo.save(
      userRepo.create({
        email: spec.email,
        name: spec.name,
        password:
          this.config.get<string>('DEMO_USER_PASSWORD') ?? 'demo-user-password',
        avatar,
        avatarProvider: 'dicebear',
        avatarStorageKey: spec.email,
      }),
    );
  }

  private createWorkspaceMemberships(
    manager: EntityManager,
    workspaceId: string,
    owner: User,
    demoUsers: User[],
  ) {
    const memberRepo = manager.getRepository(WorkspaceMember);
    const byEmail = new Map(DEMO_USERS.map((spec) => [spec.email, spec]));

    return memberRepo.save([
      memberRepo.create({
        workspaceId,
        userId: owner.id,
        role: WorkspaceRole.OWNER,
      }),
      ...demoUsers.map((user) =>
        memberRepo.create({
          workspaceId,
          userId: user.id,
          role: byEmail.get(user.email)?.workspaceRole ?? WorkspaceRole.MEMBER,
        }),
      ),
    ]);
  }

  private async createTeams(
    manager: EntityManager,
    workspaceId: string,
    ownerId: string,
    locale: AppLocale,
  ): Promise<Record<string, Team>> {
    const teamRepo = manager.getRepository(Team);
    const teams = this.getDemoText(locale).teams;
    const saved = await teamRepo.save(
      teams.map((team) =>
        teamRepo.create({
          name: team.name,
          description: team.description,
          color: team.color,
          workspaceId,
          createdById: ownerId,
        }),
      ),
    );
    return Object.fromEntries(
      saved.map((team, index) => [teams[index].key, team]),
    );
  }

  private createTeamMemberships(
    manager: EntityManager,
    teams: Record<string, Team>,
    owner: User,
    demoUsers: User[],
  ) {
    const memberRepo = manager.getRepository(TeamMember);
    const specsByEmail = new Map(DEMO_USERS.map((spec) => [spec.email, spec]));
    const memberships = [
      ...['management', 'dev', 'design'].map((teamKey) =>
        memberRepo.create({ teamId: teams[teamKey].id, userId: owner.id }),
      ),
    ];

    demoUsers.forEach((user) => {
      const spec = specsByEmail.get(user.email);
      spec?.teamKeys.forEach((teamKey) => {
        memberships.push(
          memberRepo.create({ teamId: teams[teamKey].id, userId: user.id }),
        );
      });
    });

    return memberRepo.save(memberships);
  }

  private async createBoards(
    manager: EntityManager,
    workspaceId: string,
    ownerId: string,
    locale: AppLocale,
  ): Promise<Array<Board & { demoKey: string; demoColumns: Column[] }>> {
    const boardRepo = manager.getRepository(Board);
    const columnRepo = manager.getRepository(Column);
    const boards: Array<Board & { demoKey: string; demoColumns: Column[] }> =
      [];
    const boardSpecs = this.getDemoText(locale).boards;

    for (const spec of boardSpecs) {
      const board = await boardRepo.save(
        boardRepo.create({
          title: spec.title,
          description: spec.description,
          color: spec.color,
          ownerId,
          workspaceId,
        }),
      );
      const columns = await columnRepo.save(
        spec.columns.map((title, order) =>
          columnRepo.create({ title, order, boardId: board.id }),
        ),
      );
      boards.push(
        Object.assign(board, { demoKey: spec.key, demoColumns: columns }),
      );
    }

    return boards;
  }

  private createBoardAccess(
    manager: EntityManager,
    boards: Board[],
    ownerId: string,
    demoUsers: User[],
  ) {
    const memberRepo = manager.getRepository(BoardMember);
    const memberships = boards.flatMap((board, boardIndex) =>
      demoUsers.map((user, userIndex) =>
        memberRepo.create({
          boardId: board.id,
          userId: user.id,
          invitedById: ownerId,
          role:
            (boardIndex + userIndex) % 5 === 0
              ? BoardRole.VIEWER
              : BoardRole.EDITOR,
        }),
      ),
    );
    return memberRepo.save(memberships);
  }

  private async createTasks(
    manager: EntityManager,
    boards: Array<Board & { demoKey: string; demoColumns: Column[] }>,
    teams: Record<string, Team>,
    owner: User,
    demoUsers: User[],
    locale: AppLocale,
  ) {
    const taskRepo = manager.getRepository(Task);
    const allUsers = [owner, ...demoUsers];
    const teamList = Object.values(teams);
    const tasks: Task[] = [];
    const taskBoardIds: string[] = [];
    const now = new Date();

    boards.forEach((board, boardIndex) => {
      const labels = this.getDemoText(locale).boards.find(
        (item) => item.key === board.demoKey,
      )!.labels;
      board.demoColumns.forEach((column, columnIndex) => {
        const isDoneColumn = columnIndex === board.demoColumns.length - 1;
        for (let order = 0; order < 5; order += 1) {
          const globalIndex = boardIndex * 25 + columnIndex * 5 + order;
          const assignee =
            globalIndex % 7 === 0
              ? null
              : allUsers[globalIndex % allUsers.length];
          const team = teamList[globalIndex % teamList.length];
          const analyticsSeed = buildDemoTaskAnalyticsSeed(
            globalIndex,
            isDoneColumn,
            now,
          );

          tasks.push(
            taskRepo.create({
              title: this.getTaskTitle(
                board.title,
                column.title,
                globalIndex,
                locale,
              ),
              description: this.getTaskDescription(
                board.title,
                labels,
                globalIndex,
                locale,
              ),
              priority: this.getPriority(globalIndex),
              order,
              labels: this.pickLabels(labels, globalIndex),
              dueDate: analyticsSeed.dueDate,
              assigneeId: assignee?.id,
              assigneeName: assignee?.name,
              teamId: team.id,
              isCompleted: analyticsSeed.isCompleted,
              completedAt: analyticsSeed.completedAt,
              estimateMinutes: analyticsSeed.estimateMinutes,
              storyPoints: analyticsSeed.storyPoints,
              createdAt: analyticsSeed.createdAt,
              updatedAt: analyticsSeed.updatedAt,
              columnId: column.id,
            }),
          );
          taskBoardIds.push(board.id);
        }
      });
    });

    const savedTasks = await taskRepo.save(tasks);
    const commentSeeds = buildDemoTaskCommentSeeds(
      savedTasks.map((task, index) => ({
        id: task.id,
        boardId: taskBoardIds[index],
        createdAt: task.createdAt,
        completedAt: task.completedAt,
      })),
      allUsers,
      locale,
    );
    const commentRepo = manager.getRepository(TaskComment);
    await commentRepo.save(
      commentSeeds.map((seed) => commentRepo.create(seed)),
    );

    return savedTasks;
  }

  private createSavedViews(
    manager: EntityManager,
    boards: Array<Board & { demoKey: string }>,
    teams: Record<string, Team>,
    ownerId: string,
    locale: AppLocale,
  ) {
    const viewRepo = manager.getRepository(BoardView);
    const savedViews = this.getDemoText(locale).savedViews;
    const sprint =
      boards.find((board) => board.demoKey === 'sprint') ?? boards[0];
    const design =
      boards.find((board) => board.demoKey === 'design') ?? boards[0];
    const support =
      boards.find((board) => board.demoKey === 'support') ?? boards[0];

    return viewRepo.save([
      viewRepo.create({
        boardId: sprint.id,
        ownerId,
        title: savedViews.urgent,
        filters: {
          search: '',
          assignee: 'me',
          team: 'all',
          priority: 'urgent',
          status: 'open',
          labels: [],
        },
        sort: { sort: 'priority' },
        isDefault: true,
      }),
      viewRepo.create({
        boardId: support.id,
        ownerId,
        title: savedViews.overdue,
        filters: {
          search: '',
          assignee: 'all',
          team: teams.support.id,
          priority: 'all',
          status: 'overdue',
          labels: ['customer'],
        },
        sort: { sort: 'dueDate' },
      }),
      viewRepo.create({
        boardId: design.id,
        ownerId,
        title: savedViews.design,
        filters: {
          search: '',
          assignee: 'all',
          team: teams.design.id,
          priority: 'all',
          status: 'open',
          labels: ['ux'],
        },
        sort: { sort: 'updatedAt' },
      }),
    ]);
  }

  private getAvatarUrl(seed: string) {
    return `https://api.dicebear.com/10.x/glyphs/svg?seed=${encodeURIComponent(seed)}`;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getPriority(index: number) {
    const priorities = [
      TaskPriority.URGENT,
      TaskPriority.HIGH,
      TaskPriority.MEDIUM,
      TaskPriority.LOW,
    ];
    return priorities[index % priorities.length];
  }

  private pickLabels(labels: string[], index: number) {
    return [labels[index % labels.length], labels[(index + 2) % labels.length]];
  }

  private getTaskTitle(
    boardTitle: string,
    columnTitle: string,
    index: number,
    locale: AppLocale,
  ) {
    const { taskObjects, taskVerbs } = this.getDemoText(locale);
    const verb = taskVerbs[index % taskVerbs.length];
    const object =
      taskObjects[(index + columnTitle.length) % taskObjects.length];
    return locale === 'ru'
      ? `${verb} ${object} для ${boardTitle}`
      : `${verb} ${object} for ${boardTitle}`;
  }

  private getTaskDescription(
    boardTitle: string,
    labels: string[],
    index: number,
    locale: AppLocale,
  ) {
    const label = labels[index % labels.length];
    if (locale === 'ru') {
      return [
        `Demo task для ${boardTitle}.`,
        `Проверьте filters, saved views, команды, роли и дедлайны на сценарии ${label}.`,
        'Эти данные можно безопасно менять и сбрасывать из demo banner.',
      ].join(' ');
    }
    return [
      `Demo task for ${boardTitle}.`,
      `Use filters, saved views, teams, roles, and due dates to inspect this ${label} scenario.`,
      'This data is safe to change and can be reset from the demo banner.',
    ].join(' ');
  }
}
