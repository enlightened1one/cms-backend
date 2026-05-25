import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import appConfig from './app.config';

/**
 * ConfigModule — validates all required environment variables at startup.
 * If any required variable is missing the application will fail to boot,
 * preventing silent runtime misconfigurations in production.
 */
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRES_IN: Joi.string().default('7d'),
        BCRYPT_SALT_ROUNDS: Joi.number().default(12),
        FRONTEND_URL: Joi.string().uri().default('http://localhost:5173'),
        ALLOWED_ORIGINS: Joi.string().default('http://localhost:3000'),
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
  ],
})
export class ConfigModule {}
