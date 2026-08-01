import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { SupabaseJwtService } from './supabase-jwt.service';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => jest.fn()),
  jwtVerify: jest.fn(),
}));

describe('SupabaseJwtService', () => {
  const mockedCreateRemoteJWKSet = jest.mocked(createRemoteJWKSet);
  const mockedJwtVerify = jest.mocked(jwtVerify);
  let service: SupabaseJwtService;

  beforeEach(() => {
    jest.clearAllMocks();

    const values: Record<string, string> = {
      SUPABASE_JWT_ISSUER: 'https://project.supabase.co/auth/v1',
      SUPABASE_JWKS_URL:
        'https://project.supabase.co/auth/v1/.well-known/jwks.json',
    };
    const configService = {
      getOrThrow: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;

    service = new SupabaseJwtService(configService);
  });

  it('configura a fonte JWKS a partir da URL', () => {
    expect(mockedCreateRemoteJWKSet).toHaveBeenCalledWith(
      new URL('https://project.supabase.co/auth/v1/.well-known/jwks.json'),
    );
  });

  it('valida o token e retorna somente a identidade autenticada', async () => {
    mockedJwtVerify.mockResolvedValue({
      payload: {
        aud: 'authenticated',
        email: 'personal@example.com',
        exp: 2_000_000_000,
        role: 'authenticated',
        sub: 'auth-user-id',
      },
      protectedHeader: { alg: 'ES256' },
    });

    await expect(service.validateAccessToken('access-token')).resolves.toEqual({
      id: 'auth-user-id',
      email: 'personal@example.com',
      role: 'authenticated',
    });
    expect(mockedJwtVerify).toHaveBeenCalledWith(
      'access-token',
      expect.any(Function),
      {
        algorithms: ['ES256', 'RS256'],
        audience: 'authenticated',
        issuer: 'https://project.supabase.co/auth/v1',
        requiredClaims: ['sub', 'email', 'exp'],
      },
    );
  });

  it('rejeita payload sem email válido', async () => {
    mockedJwtVerify.mockResolvedValue({
      payload: { sub: 'auth-user-id' },
      protectedHeader: { alg: 'ES256' },
    });

    await expect(service.validateAccessToken('access-token')).rejects.toThrow(
      'Token sem identidade de usuário válida',
    );
  });

  it('propaga falhas de assinatura ou claims do jose', async () => {
    mockedJwtVerify.mockRejectedValue(new Error('JWT verification failed'));

    await expect(
      service.validateAccessToken('invalid-access-token'),
    ).rejects.toThrow('JWT verification failed');
  });
});
