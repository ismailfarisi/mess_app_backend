import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggerService } from './logger/logger.service';
import { LoggerInterceptor } from './logger/logger.interceptor';
import { corsConfig } from './app.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const environment = process.env.NODE_ENV || 'development';
  app.enableCors(corsConfig[environment]);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      transform: true, // Transform payloads to DTO instances
      forbidNonWhitelisted: true, // Throw errors if non-whitelisted values are provided
      transformOptions: {
        enableImplicitConversion: true, // Automatically transform payload types
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Auth API')
    .setDescription('Authentication API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const logger = app.get(LoggerService);
  app.useGlobalInterceptors(new LoggerInterceptor(logger));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
