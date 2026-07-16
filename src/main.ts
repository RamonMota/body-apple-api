import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfiguration } from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<AppConfiguration, true>);
  const frontendUrl = configService.get('frontendUrl', { infer: true });
  const port = configService.get('port', { infer: true });

  app.enableCors({ origin: frontendUrl });
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  await app.listen(port);
}
void bootstrap();
