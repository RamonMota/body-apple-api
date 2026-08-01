import { validateEnvironment } from './env.validation';

describe('validateEnvironment', () => {
  const validEnvironment = {
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_JWT_ISSUER: 'https://project.supabase.co/auth/v1',
    SUPABASE_JWKS_URL:
      'https://project.supabase.co/auth/v1/.well-known/jwks.json',
  };

  it('aceita as URLs necessárias para autenticação', () => {
    expect(validateEnvironment(validEnvironment)).toEqual(
      expect.objectContaining(validEnvironment),
    );
  });

  it.each(['SUPABASE_URL', 'SUPABASE_JWT_ISSUER', 'SUPABASE_JWKS_URL'])(
    'exige a variável %s',
    (key) => {
      const environment = { ...validEnvironment };
      delete environment[key as keyof typeof environment];

      expect(() => validateEnvironment(environment)).toThrow(
        `${key} é obrigatória`,
      );
    },
  );

  it('rejeita uma JWKS URL que não seja HTTP ou HTTPS', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        SUPABASE_JWKS_URL: 'file:///tmp/jwks.json',
      }),
    ).toThrow('SUPABASE_JWKS_URL deve ser uma URL HTTP ou HTTPS válida');
  });
});
