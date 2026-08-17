export interface BaseResponse<T> {
  status_code: number;
  message: string;
  data: T | null;
  error: { detail: string } | null;
  timestamp: string;
  path: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public override message: string,
    public detail?: unknown,
  ) {
    super(message);
  }
}
