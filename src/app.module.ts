import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import configuration from './config/configuration';
import { validateEnvironment } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { RoutinesModule } from './routines/routines.module';
import { StudentsModule } from './students/students.module';
import { TrainersModule } from './trainers/trainers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      envFilePath: ['.env.local', '.env'],
      isGlobal: true,
      load: [configuration],
      validate: validateEnvironment,
    }),
    AuthModule,
    HealthModule,
    PrismaModule,
    RoutinesModule,
    StudentsModule,
    TrainersModule,
  ],
})
export class AppModule {}
