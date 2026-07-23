import { useOfflineBoardNavigationStore } from './offline-board-navigation.store';

describe('offline board navigation store', () => {
  afterEach(() => {
    useOfflineBoardNavigationStore.getState().clearSelection();
  });

  it('selects and clears a cached board without changing the route', () => {
    useOfflineBoardNavigationStore.getState().selectBoard('board-2');

    expect(useOfflineBoardNavigationStore.getState().view).toEqual({
      type: 'board',
      boardId: 'board-2',
    });

    useOfflineBoardNavigationStore.getState().clearSelection();

    expect(useOfflineBoardNavigationStore.getState().view).toBeNull();
  });

  it('opens the cached board catalog', () => {
    useOfflineBoardNavigationStore
      .getState()
      .openCatalog('workspace-1');

    expect(useOfflineBoardNavigationStore.getState().view).toEqual({
      type: 'catalog',
      workspaceId: 'workspace-1',
    });
  });
});
