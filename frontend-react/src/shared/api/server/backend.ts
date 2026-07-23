import 'server-only';

const SERVER_PREFETCH_TIMEOUT_MS = 1_500;

export class BackendUnavailableError extends Error {
  constructor(message = 'Backend is temporarily unavailable') {
    super(message);
    this.name = 'BackendUnavailableError';
  }
}

export const isBackendUnavailableError = (
  error: unknown,
): error is BackendUnavailableError =>
  error instanceof BackendUnavailableError ||
  (error as { name?: string } | null)?.name === 'BackendUnavailableError';

export const fetchBackendApi = async (
  input: string | URL,
  init: RequestInit = {},
) => {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    SERVER_PREFETCH_TIMEOUT_MS,
  );

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch {
    throw new BackendUnavailableError();
  } finally {
    clearTimeout(timeout);
  }
};
