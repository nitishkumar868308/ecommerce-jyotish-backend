import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { urlencoded } from 'express';
import { join } from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve uploaded files from /public/uploads at /uploads/*. Must be before
  // Helmet's crossOriginResourcePolicy so browsers can embed these in <img>.
  // maxAge keeps uploaded images in the CDN/browser cache for a week — they
  // are content-addressed by filename so we don't need per-request revalidation.
  app.useStaticAssets(join(process.cwd(), 'public'), {
    prefix: '/',
    maxAge: '7d',
    etag: true,
    lastModified: true,
  });

  // Security
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cookieParser());
  // PayU posts back as application/x-www-form-urlencoded — NestJS only
  // parses JSON by default, so the webhook would see an empty body
  // without this middleware.
  app.use(urlencoded({ extended: true }));

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-country', 'Cookie'],
  });

  // Global pipes, filters, interceptors
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Global prefix
  app.setGlobalPrefix('api');

  // Swagger — only mounted outside production to keep the prod surface lean
  // and start-up fast. Set `ENABLE_SWAGGER=true` in env to force-enable
  // (handy when debugging against a staging box).
  const swaggerEnabled =
    process.env.NODE_ENV !== 'production' ||
    process.env.ENABLE_SWAGGER === 'true';
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Hecate Wizard Mall API')
      .setDescription('Ecommerce + Jyotish Backend API Documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('session')
      .addApiKey({ type: 'apiKey', name: 'x-country', in: 'header' }, 'x-country')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
  }

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`> Backend API running at http://localhost:${port}`);
  if (swaggerEnabled) {
    console.log(`> API Docs at http://localhost:${port}/docs`);
  }
}

bootstrap();
