import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { SupabaseJwtService } from './supabase-jwt.service';

@Module({
  controllers: [AuthController],
  providers: [SupabaseJwtService, AuthGuard],
  exports: [SupabaseJwtService, AuthGuard],
})
export class AuthModule {}
