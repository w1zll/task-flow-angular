import { TaskPriority } from '@/tasks/entities/task.entity';
import { AppLocale } from '@/common/locale/request-locale';

export enum BoardTemplate {
  EMPTY = 'empty',
  SCRUM = 'scrum',
}

export const SCRUM_COLUMN_KEYS = [
  'Backlog',
  'Sprint',
  'In Progress',
  'Review',
  'Testing',
  'Done',
] as const;

export type ScrumColumnKey = (typeof SCRUM_COLUMN_KEYS)[number];

export const SCRUM_COLUMN_TITLES: Record<AppLocale, Record<ScrumColumnKey, string>> = {
  en: {
    Backlog: 'Backlog',
    Sprint: 'Sprint',
    'In Progress': 'In Progress',
    Review: 'Review',
    Testing: 'Testing',
    Done: 'Done',
  },
  ru: {
    Backlog: 'Бэклог',
    Sprint: 'Спринт',
    'In Progress': 'В работе',
    Review: 'Ревью',
    Testing: 'Тестирование',
    Done: 'Готово',
  },
};

export const getScrumColumnTitles = (locale: AppLocale) =>
  SCRUM_COLUMN_KEYS.map((key) => SCRUM_COLUMN_TITLES[locale][key]);

export const createScrumColumns = (boardId: string, locale: AppLocale) =>
  getScrumColumnTitles(locale).map((title, order) => ({
    title,
    order,
    boardId,
  }));

const shiftDate = (baseDate: Date, days: number, hours = 0) =>
  new Date(baseDate.getTime() + (days * 24 + hours) * 60 * 60 * 1000);

export const createWelcomeTasks = (
  columnsByKey: Record<ScrumColumnKey, { id: string }>,
  registeredAt: Date,
  locale: AppLocale,
) => {
  const text = {
    en: {
      board: {
        title: 'Welcome to TaskFlow',
        description: 'A prefilled board with tasks for exploring the workflow.',
      },
      tasks: [
        ['Explore your new workspace', 'Open task cards, update fields, and see how the board reacts.'],
        ['Plan the first sprint', 'Collect the next useful tasks before moving them into work.'],
        ['Connect your real workflow', 'Rename columns, add labels, and invite teammates.'],
        ['Review board sharing', 'Check member access and decide who should collaborate.'],
        ['Check completion analytics', 'Switch the chart between days, weeks, and months.'],
        ['Created your first account', 'This task is completed today so the daily chart has data.'],
        ['Finished onboarding checklist', 'A recent completed task for yesterday on the daily chart.'],
        ['Verified weekly reporting', 'An older completion so the weekly chart has another bucket.'],
        ['Closed the first sprint retro', 'A completed task from a previous week.'],
        ['Imported historical progress', 'A completed task from an earlier month for monthly charts.'],
      ],
    },
    ru: {
      board: {
        title: 'Добро пожаловать в TaskFlow',
        description: 'Заполненная доска с задачами для знакомства с рабочим процессом.',
      },
      tasks: [
        ['Изучите новое рабочее пространство', 'Откройте карточки задач, измените поля и посмотрите, как реагирует доска.'],
        ['Запланируйте первый спринт', 'Соберите ближайшие полезные задачи перед началом работы.'],
        ['Настройте реальный процесс', 'Переименуйте колонки, добавьте метки и пригласите команду.'],
        ['Проверьте доступ к доске', 'Посмотрите список участников и решите, кто должен работать вместе с вами.'],
        ['Проверьте аналитику выполнения', 'Переключите график между днями, неделями и месяцами.'],
        ['Создан первый аккаунт', 'Эта задача выполнена сегодня, чтобы на дневном графике были данные.'],
        ['Завершен чеклист знакомства', 'Недавняя выполненная задача для вчерашнего дня на графике.'],
        ['Проверена недельная отчетность', 'Более старая выполненная задача для отдельной недели на графике.'],
        ['Закрыта ретроспектива первого спринта', 'Выполненная задача из предыдущей недели.'],
        ['Импортирован исторический прогресс', 'Выполненная задача из прошлого месяца для месячного графика.'],
      ],
    },
  }[locale];

  return [
    {
      title: text.tasks[0][0],
      description: text.tasks[0][1],
      priority: TaskPriority.MEDIUM,
      order: 0,
      labels: ['onboarding'],
      dueDate: shiftDate(registeredAt, 1),
      columnId: columnsByKey.Backlog.id,
    },
    {
      title: text.tasks[1][0],
      description: text.tasks[1][1],
      priority: TaskPriority.HIGH,
      order: 0,
      labels: ['planning'],
      dueDate: shiftDate(registeredAt, 3),
      columnId: columnsByKey.Sprint.id,
    },
    {
      title: text.tasks[2][0],
      description: text.tasks[2][1],
      priority: TaskPriority.HIGH,
      order: 0,
      labels: ['workflow'],
      dueDate: shiftDate(registeredAt, 5),
      columnId: columnsByKey['In Progress'].id,
    },
    {
      title: text.tasks[3][0],
      description: text.tasks[3][1],
      priority: TaskPriority.MEDIUM,
      order: 0,
      labels: ['review'],
      dueDate: shiftDate(registeredAt, 7),
      columnId: columnsByKey.Review.id,
    },
    {
      title: text.tasks[4][0],
      description: text.tasks[4][1],
      priority: TaskPriority.MEDIUM,
      order: 0,
      labels: ['analytics'],
      dueDate: shiftDate(registeredAt, 2),
      columnId: columnsByKey.Testing.id,
    },
    {
      title: text.tasks[5][0],
      description: text.tasks[5][1],
      priority: TaskPriority.LOW,
      order: 0,
      labels: ['done', 'today'],
      dueDate: shiftDate(registeredAt, 1),
      isCompleted: true,
      completedAt: shiftDate(registeredAt, 0, -1),
      columnId: columnsByKey.Done.id,
    },
    {
      title: text.tasks[6][0],
      description: text.tasks[6][1],
      priority: TaskPriority.MEDIUM,
      order: 1,
      labels: ['done'],
      dueDate: shiftDate(registeredAt, 0),
      isCompleted: true,
      completedAt: shiftDate(registeredAt, -1),
      columnId: columnsByKey.Done.id,
    },
    {
      title: text.tasks[7][0],
      description: text.tasks[7][1],
      priority: TaskPriority.MEDIUM,
      order: 2,
      labels: ['done', 'analytics'],
      dueDate: shiftDate(registeredAt, -6),
      isCompleted: true,
      completedAt: shiftDate(registeredAt, -8),
      columnId: columnsByKey.Done.id,
    },
    {
      title: text.tasks[8][0],
      description: text.tasks[8][1],
      priority: TaskPriority.HIGH,
      order: 3,
      labels: ['done', 'sprint'],
      dueDate: shiftDate(registeredAt, -13),
      isCompleted: true,
      completedAt: shiftDate(registeredAt, -15),
      columnId: columnsByKey.Done.id,
    },
    {
      title: text.tasks[9][0],
      description: text.tasks[9][1],
      priority: TaskPriority.LOW,
      order: 4,
      labels: ['done', 'history'],
      dueDate: shiftDate(registeredAt, -37),
      isCompleted: true,
      completedAt: shiftDate(registeredAt, -35),
      columnId: columnsByKey.Done.id,
    },
  ];
};

export const getWelcomeBoardText = (locale: AppLocale) =>
  locale === 'ru'
    ? {
        title: 'Добро пожаловать в TaskFlow',
        description:
          'Заполненная доска с задачами для знакомства с рабочим процессом.',
      }
    : {
        title: 'Welcome to TaskFlow',
        description: 'A prefilled board with tasks for exploring the workflow.',
      };
