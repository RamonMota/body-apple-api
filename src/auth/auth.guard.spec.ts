import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthenticatedRequest } from './authenticated-request.type';
import { SupabaseJwtService } from './supabase-jwt.service';

describe('AuthGuard', () => {
  const user = {
    id: 'auth-user-id',
    email: 'personal@example.com',
    role: 'authenticated',
  };
  let supabaseJwtService: jest.Mocked<
    Pick<SupabaseJwtService, 'validateAccessToken'>
  >;
  let guard: AuthGuard;

  beforeEach(() => {
    supabaseJwtService = {
      validateAccessToken: jest.fn(),
    };
    guard = new AuthGuard(supabaseJwtService as unknown as SupabaseJwtService);
  });

  function contextFor(
    request: Partial<AuthenticatedRequest>,
  ): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  }

  it('anexa o usuário validado à requisição', async () => {
    const request = {
      headers: { authorization: 'Bearer valid-token' },
    } as Partial<AuthenticatedRequest>;
    supabaseJwtService.validateAccessToken.mockResolvedValue(user);

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(supabaseJwtService.validateAccessToken).toHaveBeenCalledWith(
      'valid-token',
    );
    expect(request.user).toEqual(user);
  });

  it('rejeita requisição sem Bearer token', async () => {
    const request = { headers: {} } as Partial<AuthenticatedRequest>;

    await expect(guard.canActivate(contextFor(request))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(supabaseJwtService.validateAccessToken).not.toHaveBeenCalled();
  });

  it('rejeita token que falha na validação', async () => {
    const request = {
      headers: { authorization: 'Bearer invalid-token' },
    } as Partial<AuthenticatedRequest>;
    supabaseJwtService.validateAccessToken.mockRejectedValue(
      new Error('invalid'),
    );

    await expect(guard.canActivate(contextFor(request))).rejects.toThrow(
      'Access token inválido ou expirado',
    );
  });
});
