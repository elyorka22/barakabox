import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  logger.log(
    JSON.stringify({
      event: 'spaces_env_bootstrap',
      endpoint: process.env.SPACES_ENDPOINT ?? null,
      region: process.env.SPACES_REGION ?? null,
      bucket: process.env.SPACES_BUCKET ?? null,
      hasSpacesKey: Boolean(process.env.SPACES_KEY),
      hasSpacesSecret: Boolean(process.env.SPACES_SECRET),
    }),
  );
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',').map((item) => item.trim()) ?? '*',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
