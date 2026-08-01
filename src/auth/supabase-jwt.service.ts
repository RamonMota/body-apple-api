import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { AuthenticatedUser } from './authenticated-user.type';

@Injectable()
export class SupabaseJwtService {
  private readonly issuer: string;
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(configService: ConfigService) {
    this.issuer = configService.getOrThrow<string>('SUPABASE_JWT_ISSUER');
    const jwksUrl = configService.getOrThrow<string>('SUPABASE_JWKS_URL');

    this.jwks = createRemoteJWKSet(new URL(jwksUrl));
  }

  async validateAccessToken(token: string): Promise<AuthenticatedUser> {
    const { payload } = await jwtVerify(token, this.jwks, {
      algorithms: ['ES256', 'RS256'],
      audience: 'authenticated',
      issuer: this.issuer,
      requiredClaims: ['sub', 'email', 'exp'],
    });

    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
      throw new Error('Token sem identidade de usuário válida');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: typeof payload.role === 'string' ? payload.role : undefined,
    };
  }
}
