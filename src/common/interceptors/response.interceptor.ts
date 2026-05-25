import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/response.interface';

/**
 * ResponseInterceptor wraps every successful controller response in a consistent
 * ApiResponse envelope so the frontend always receives { success, message, data, timestamp }.
 *
 * If the handler already returns an ApiResponse shape (has a `success` key), it passes through unchanged.
 */
@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((responseData) => {
        // Avoid double-wrapping if service already built the envelope
        if (
          responseData &&
          typeof responseData === 'object' &&
          'success' in responseData
        ) {
          return responseData;
        }

        return {
          success: true,
          message: 'Request successful',
          data: responseData ?? null,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
