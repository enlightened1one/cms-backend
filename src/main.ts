import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') ?? 3001;
  const apiPrefix = configService.get<string>('app.apiPrefix') ?? 'api/v1';
  const allowedOrigins = configService.get<string[]>('app.allowedOrigins') ?? ['*'];
  const appName = configService.get<string>('app.name') ?? 'CCMS API';
  const nodeEnv = configService.get<string>('app.nodeEnv');

  // ── CORS ──────────────────────────────────────────────────
  app.enableCors({
    // origin: nodeEnv === 'production' ? allowedOrigins : '*',
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // ── Global API prefix ─────────────────────────────────────
  app.setGlobalPrefix(apiPrefix);

  // ── Global validation pipe ────────────────────────────────
  // whitelist strips unknown properties; forbidNonWhitelisted throws on them
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ── Swagger / OpenAPI ─────────────────────────────────────

  // ── Swagger / OpenAPI (enabled in all environments, incl. production) ──
  const swaggerConfig = new DocumentBuilder()
    .setTitle(appName)
    .setDescription(
      `## CCMS — Customer Complaint Management System\n\n` +
        `Multi-tenant SaaS backend for managing logistics complaints end-to-end.\n\n` +
        `### Authentication\n` +
        `All endpoints (except \`/auth/register\` and \`/auth/login\`) require a Bearer JWT token.\n\n` +
        `### Tenant Isolation\n` +
        `All data is scoped to the authenticated user's tenant. Agents can only see complaints within their own organisation.\n\n` +
        `### Status Machine\n` +
        `OPEN → ASSIGNED → IN_PROGRESS → PENDING_VENDOR → RESOLVED → CLOSED\n` +
        `RESOLVED → REOPENED → IN_PROGRESS`,
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'Register, login, and retrieve authenticated user profile')
    .addTag('Tenants', 'Organisation (tenant) management — SUPER_ADMIN only')
    .addTag('Users', 'User management within a tenant')
    .addTag('Complaints', 'Full complaint lifecycle — create, assign, update status, resolve')
    .addTag('Activities', 'Immutable audit log of all system events')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
      filter: true,
      showExtensions: true,
    },
    customSiteTitle: `${appName} — API Docs`,
  });

  logger.log(`📖 Swagger docs: http://localhost:${port}/${apiPrefix}/docs`);

  // ── Graceful shutdown ─────────────────────────────────────
  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(`🚀 ${appName} running on port ${port} [${nodeEnv}]`);
  logger.log(`🔗 Base URL: http://localhost:${port}/${apiPrefix}`);
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start application:', err);
  process.exit(1);
});
