import {
  DEFAULT_BOARD_LAYOUT,
  parseBoardLayoutFromSearchParams,
  writeBoardLayoutToSearchParams,
} from './board-layout';

describe('board layout URL helpers', () => {
  it('parses known layouts and falls back to kanban', () => {
    expect(
      parseBoardLayoutFromSearchParams(new URLSearchParams('layout=calendar')),
    ).toBe('calendar');
    expect(
      parseBoardLayoutFromSearchParams(new URLSearchParams('layout=timeline')),
    ).toBe('timeline');
    expect(
      parseBoardLayoutFromSearchParams(new URLSearchParams('layout=unknown')),
    ).toBe(DEFAULT_BOARD_LAYOUT);
  });

  it('writes layout without dropping filter, view, or task params', () => {
    const next = writeBoardLayoutToSearchParams(
      'roadmap',
      new URLSearchParams('view=view-1&taskId=task-1&q=bug'),
    );

    expect(next.get('layout')).toBe('roadmap');
    expect(next.get('view')).toBe('view-1');
    expect(next.get('taskId')).toBe('task-1');
    expect(next.get('q')).toBe('bug');
  });

  it('removes layout for the default kanban view', () => {
    const next = writeBoardLayoutToSearchParams(
      'kanban',
      new URLSearchParams('layout=calendar&taskId=task-1'),
    );

    expect(next.get('layout')).toBeNull();
    expect(next.get('taskId')).toBe('task-1');
  });
});
