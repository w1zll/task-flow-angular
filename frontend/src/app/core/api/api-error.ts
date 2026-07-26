export type ApiErrorKind =
  | 'network'
  | 'unexpected-response'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'validation'
  | 'server'
  | 'unknown';

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    readonly status: number,
    readonly code: string,
    readonly retryable: boolean,
  ) {
    super(code);
    this.name = 'ApiError';
  }
}
