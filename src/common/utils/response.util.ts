import { ApiResponse } from '../interfaces/response.interface';

export function buildResponse<T>(message: string, data: T = null, success = true): ApiResponse<T> {
  return {
    success,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}
