import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedRequest } from './authenticated-request.type';
import { SupabaseJwtService } from './supabase-jwt.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly supabaseJwtService: SupabaseJwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request.headers.authorization);

    try {
      request.user = await this.supabaseJwtService.validateAccessToken(token);
      return true;
    } catch {
      throw new UnauthorizedException('Access token inválido ou expirado');
    }
  }

  private extractBearerToken(authorization?: string): string {
    const parts = authorization?.trim().split(/\s+/) ?? [];

    if (
      parts.length !== 2 ||
      parts[0]?.toLowerCase() !== 'bearer' ||
      !parts[1]
    ) {
      throw new UnauthorizedException('Access token não informado');
    }

    return parts[1];
  }
}
