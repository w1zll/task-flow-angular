import {
  markNetworkOffline,
  markNetworkOnline,
  subscribeToBrowserOnlineStatus,
} from './offline';

describe('offline network status', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('emits status changes only when the offline marker changes', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToBrowserOnlineStatus(listener);

    markNetworkOffline();
    markNetworkOffline();
    markNetworkOnline();
    markNetworkOnline();

    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });
});
