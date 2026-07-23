export const BOARD_LAYOUTS = [
  'kanban',
  'calendar',
  'timeline',
  'roadmap',
] as const;

export type BoardLayout = (typeof BOARD_LAYOUTS)[number];

export const DEFAULT_BOARD_LAYOUT: BoardLayout = 'kanban';

const VALID_BOARD_LAYOUTS = new Set<string>(BOARD_LAYOUTS);

export const parseBoardLayoutFromSearchParams = (
  searchParams: URLSearchParams,
): BoardLayout => {
  const layout = searchParams.get('layout');

  return layout && VALID_BOARD_LAYOUTS.has(layout)
    ? (layout as BoardLayout)
    : DEFAULT_BOARD_LAYOUT;
};

export const writeBoardLayoutToSearchParams = (
  layout: BoardLayout,
  searchParams: URLSearchParams,
) => {
  const next = new URLSearchParams(searchParams.toString());

  if (layout === DEFAULT_BOARD_LAYOUT) {
    next.delete('layout');
  } else {
    next.set('layout', layout);
  }

  return next;
};
