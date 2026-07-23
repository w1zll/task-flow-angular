import { act, render } from '@testing-library/react';
import RouteProgressBar from './RouteProgressBar';

let mockIsOffline = false;

jest.mock('@/shared/hooks/useOnlineStatus', () => ({
  useIsOffline: () => mockIsOffline,
}));

jest.mock('next/navigation', () => ({
  usePathname: () => '/workspaces/workspace-1/boards/board-1',
  useSearchParams: () => new URLSearchParams(),
}));

describe('RouteProgressBar browser navigation', () => {
  afterEach(() => {
    mockIsOffline = false;
  });

  it('does not start for browser back or forward while offline', () => {
    mockIsOffline = true;
    const { container } = render(<RouteProgressBar />);

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(container.querySelector('[role="progressbar"]')).toBeNull();
  });

  it('starts for browser back or forward while online', () => {
    const { container } = render(<RouteProgressBar />);

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(container.querySelector('[role="progressbar"]')).not.toBeNull();
  });
});
