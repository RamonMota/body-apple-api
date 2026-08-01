import { AuthController } from './auth.controller';

describe('AuthController', () => {
  const controller = new AuthController();

  it('retorna a identidade anexada pelo guard sem consultar dados externos', () => {
    const user = {
      id: 'auth-user-id',
      email: 'personal@example.com',
      role: 'authenticated',
    };

    expect(controller.testAuthentication(user)).toEqual({
      authenticated: true,
      user,
    });
  });
});
