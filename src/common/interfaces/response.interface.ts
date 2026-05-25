export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T | null;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]> | string[];
  statusCode: number;
  timestamp: string;
  path?: string;
}
