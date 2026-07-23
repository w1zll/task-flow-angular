import { useBackendAvailabilityStore } from './backend-availability.store';

describe('backend availability store', () => {
  beforeEach(() => {
    useBackendAvailabilityStore.setState({ status: 'checking' });
  });

  it('does not notify subscribers when the status is unchanged', () => {
    const listener = jest.fn();
    const unsubscribe = useBackendAvailabilityStore.subscribe(listener);

    useBackendAvailabilityStore.getState().setStatus('checking');
    expect(listener).not.toHaveBeenCalled();

    useBackendAvailabilityStore.getState().setStatus('starting');
    expect(listener).toHaveBeenCalledTimes(1);

    useBackendAvailabilityStore.getState().setStatus('starting');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
