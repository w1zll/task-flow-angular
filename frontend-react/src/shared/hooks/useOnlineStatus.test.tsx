import { act } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { useOnlineStatus } from './useOnlineStatus';

const OnlineStatus = () => (
  <div>{useOnlineStatus() ? 'online' : 'offline'}</div>
);

describe('useOnlineStatus hydration', () => {
  it('keeps the first client render equal to SSR while offline', async () => {
    const originalOnline = Object.getOwnPropertyDescriptor(
      window.navigator,
      'onLine',
    );
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    window.sessionStorage.clear();
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    const container = document.createElement('div');
    container.innerHTML = renderToString(<OnlineStatus />);
    expect(container.textContent).toBe('online');

    let root: Root | undefined;
    await act(async () => {
      root = hydrateRoot(container, <OnlineStatus />);
      await Promise.resolve();
    });

    expect(container.textContent).toBe('offline');
    expect(
      consoleError.mock.calls.some(([message]) =>
        String(message).includes('Hydration failed'),
      ),
    ).toBe(false);

    await act(async () => root?.unmount());
    consoleError.mockRestore();
    if (originalOnline) {
      Object.defineProperty(window.navigator, 'onLine', originalOnline);
    } else {
      delete (window.navigator as { onLine?: boolean }).onLine;
    }
  });
});
