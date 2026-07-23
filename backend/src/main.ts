import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { corsOrigin } from './common/cors/cors-origin';

const trimTrailingSlash = (value: string) => value.replace(/\/$/, '');

const withProtocol = (value: string) =>
  /^https?:\/\//i.test(value) ? value : `https://${value}`;

const getPublicBaseUrl = (port: string | number) => {
  const explicitPublicUrl =
    process.env.BACKEND_PUBLIC_URL ??
    process.env.API_PUBLIC_URL ??
    process.env.PUBLIC_URL;

  if (explicitPublicUrl) {
    return trimTrailingSlash(withProtocol(explicitPublicUrl.trim()));
  }

  const railwayUrl =
    process.env.RAILWAY_STATIC_URL ?? process.env.RAILWAY_PUBLIC_DOMAIN;

  if (railwayUrl) {
    return trimTrailingSlash(withProtocol(railwayUrl.trim()));
  }

  return `http://localhost:${port}`;
};

const getPositiveNumberEnv = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  const config = new DocumentBuilder()
    .setTitle('TaskFlow API')
    .setDescription('Task Manager / Kanban Board REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth')
    .addTag('users')
    .addTag('boards')
    .addTag('columns')
    .addTag('tasks')
    .addTag('teams')
    .addTag('whiteboards')
    .addTag('demo')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: '/api/docs.json',
  });

  const port = process.env.PORT ?? 3001;
  const server = await app.listen(port, '0.0.0.0');
  const requestTimeoutMs = getPositiveNumberEnv(
    'HTTP_REQUEST_TIMEOUT_MS',
    300_000,
  );
  server.setTimeout(requestTimeoutMs);
  server.requestTimeout = requestTimeoutMs;
  server.headersTimeout = Math.max(requestTimeoutMs + 5_000, 65_000);
  const publicBaseUrl = getPublicBaseUrl(port);
  console.log(`TaskFlow API running on ${publicBaseUrl}`);
  console.log(`Swagger docs at ${publicBaseUrl}/api/docs`);
  console.log(`OpenAPI spec at ${publicBaseUrl}/api/docs.json`);
}
bootstrap();
