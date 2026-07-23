import { useAuthStore } from './auth.store';

const originalHydrate = useAuthStore.getState().hydrate;

describe('auth store hydration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAuthStore.setState({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      hydrate: originalHydrate,
    });
  });

  afterEach(() => {
    useAuthStore.setState({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      hydrate: originalHydrate,
    });
  });

  it('preserves state identity when the same stored user is hydrated again', () => {
    const user = {
      id: 'cached-user',
      email: 'cached@example.com',
      name: 'Cached User',
      activeWorkspaceId: 'workspace-1',
    };

    originalHydrate(user);
    const hydratedState = useAuthStore.getState();
    const subscriber = jest.fn();
    const unsubscribe = useAuthStore.subscribe(subscriber);

    originalHydrate({ ...user });

    expect(useAuthStore.getState()).toBe(hydratedState);
    expect(useAuthStore.getState().user).toBe(user);
    expect(subscriber).not.toHaveBeenCalled();
    unsubscribe();
  });
});
