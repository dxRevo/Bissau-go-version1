import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configurer l'adaptateur WebSocket
  app.useWebSocketAdapter(new IoAdapter(app));
  
  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 3008;
  
  // Enable CORS for mobile apps
  app.enableCors({
    origin: true,
    credentials: true,
  });
  
  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  // Set global prefix
  app.setGlobalPrefix('api');
  
  // Listen on all interfaces (0.0.0.0) to accept connections from mobile devices
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Application is running on: http://0.0.0.0:${port}/api`);
}

bootstrap();
