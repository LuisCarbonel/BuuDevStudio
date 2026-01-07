export interface ApiError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: ApiError;
}

export interface GatewayError extends Error {
  code?: string;
  retryable?: boolean;
}
