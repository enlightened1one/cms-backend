import { Module } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { TenantIsolationGuard } from './guards/tenant-isolation.guard';
import { GlobalExceptionFilter } from './filters/http-exception.filter';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

@Module({
  providers: [
    JwtAuthGuard,
    RolesGuard,
    TenantIsolationGuard,
    GlobalExceptionFilter,
    ResponseInterceptor,
    LoggingInterceptor,
  ],
  exports: [
    JwtAuthGuard,
    RolesGuard,
    TenantIsolationGuard,
    GlobalExceptionFilter,
    ResponseInterceptor,
    LoggingInterceptor,
  ],
})
export class CommonModule {}
