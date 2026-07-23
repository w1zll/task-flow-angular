export const PRIORITY_CONFIG = {
  low: { color: '#22c55e', labelKey: 'priority.low' as const },
  medium: { color: '#f59e0b', labelKey: 'priority.medium' as const },
  high: { color: '#f97316', labelKey: 'priority.high' as const },
  urgent: { color: '#ef4444', labelKey: 'priority.urgent' as const },
} as const;

export type TaskPriorityConfig =
  (typeof PRIORITY_CONFIG)[keyof typeof PRIORITY_CONFIG];
