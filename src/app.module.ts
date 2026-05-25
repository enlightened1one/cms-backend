import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { MessagesModule } from './messages/messages.module';
import { ActivitiesModule } from './activities/activities.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  imports: [
    // ── Infrastructure ──────────────────────────────────────
    ConfigModule,
    PrismaModule,
    CommonModule,

    // ── Feature modules ─────────────────────────────────────
    AuthModule,
    UsersModule,
    TenantsModule,
    ComplaintsModule,
    MessagesModule,
    ActivitiesModule,
  ],
  providers: [
    // Apply JWT guard globally — @Public() bypasses it
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Apply roles guard globally
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // Global exception filter — unified error shape
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    // Global response interceptor — wraps all success responses
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    // Global request/response logging
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
