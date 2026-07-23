import { fireEvent, render, screen } from '@testing-library/react';
import MobileBoardToolsDrawer from './MobileBoardToolsDrawer';
import { DEFAULT_BOARD_FILTERS } from '../board-filters';

jest.mock('next-intl', () => ({
  useTranslations: () =>
    (key: string, values?: Record<string, unknown>) =>
      values?.count === undefined ? key : `${key}:${values.count}`,
}));

jest.mock('../BoardLayoutSwitcher', () => ({
  __esModule: true,
  default: () => <div>layout-switcher</div>,
}));

jest.mock('../board-filters-toolbar/BoardFiltersForm', () => ({
  __esModule: true,
  default: () => <div>filter-form</div>,
}));

jest.mock('../board-filters-toolbar/SaveViewDialog', () => ({
  __esModule: true,
  default: () => null,
}));

const createProps = () => ({
  open: true,
  activeFilterCount: 2,
  filters: DEFAULT_BOARD_FILTERS,
  layout: 'kanban' as const,
  boardMembers: [],
  teams: [],
  savedViews: [],
  selectedViewId: null,
  filteredCount: 3,
  totalCount: 5,
  isSavingView: false,
  isDeletingView: false,
  canManageSavedViews: true,
  linkedWhiteboards: [],
  isWhiteboardsError: false,
  canCreateOrAttachWhiteboard: true,
  canManageColumns: true,
  analyticsHref: '/workspaces/workspace-1/analytics?boardId=board-1',
  onClose: jest.fn(),
  onFiltersChange: jest.fn(),
  onFiltersReset: jest.fn(),
  onLayoutChange: jest.fn(),
  onApplySavedView: jest.fn(),
  onSaveView: jest.fn(),
  onDeleteSavedView: jest.fn(),
  onOpenWhiteboard: jest.fn(),
  onAttachWhiteboard: jest.fn(),
  onCreateWhiteboard: jest.fn(),
  onAddColumn: jest.fn(),
  onOpenActivity: jest.fn(),
  onOpenMembers: jest.fn(),
});

describe('MobileBoardToolsDrawer', () => {
  const isDisabled = (element: HTMLElement) =>
    element.hasAttribute('disabled') ||
    element.getAttribute('aria-disabled') === 'true';

  it('applies filters and closes the drawer', () => {
    const props = createProps();
    render(<MobileBoardToolsDrawer {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'apply' }));

    expect(props.onFiltersChange).toHaveBeenCalledWith(DEFAULT_BOARD_FILTERS);
    expect(props.onClose).toHaveBeenCalled();
    expect(screen.getByText('activeCount:2')).not.toBeNull();
  });

  it('resets active filters and preserves permission-disabled actions', () => {
    const props = {
      ...createProps(),
      canManageColumns: false,
      canCreateOrAttachWhiteboard: false,
    };
    render(<MobileBoardToolsDrawer {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'reset' }));

    expect(props.onFiltersReset).toHaveBeenCalled();
    fireEvent.click(screen.getByText('mobileTools.actions'));
    fireEvent.click(screen.getByText('boardSectionTitle'));
    expect(isDisabled(screen.getByRole('button', { name: 'addColumn' }))).toBe(
      true,
    );
    expect(isDisabled(screen.getByRole('button', { name: 'attach' }))).toBe(
      true,
    );
    expect(isDisabled(screen.getByRole('button', { name: 'create' }))).toBe(
      true,
    );
  });

  it('links analytics to the current board and closes the drawer', () => {
    const props = createProps();
    render(<MobileBoardToolsDrawer {...props} />);

    fireEvent.click(screen.getByText('mobileTools.actions'));
    const analyticsLink = screen.getByRole('link', { name: 'stats' });

    expect(analyticsLink.getAttribute('href')).toBe(
      '/workspaces/workspace-1/analytics?boardId=board-1',
    );
    fireEvent.click(analyticsLink);
    expect(props.onClose).toHaveBeenCalled();
  });
});
