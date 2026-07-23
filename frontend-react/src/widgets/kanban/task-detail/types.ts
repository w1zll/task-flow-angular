import type { Task } from '@/shared/api/api';

export type TaskDraft = Partial<Task>;

export type PatchTaskField = <K extends keyof Task>(
  key: K,
  value: Task[K],
) => void;
