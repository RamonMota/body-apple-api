const NODE_ENVIRONMENTS = ['development', 'test', 'production'] as const;

type NodeEnvironment = (typeof NODE_ENVIRONMENTS)[number];

interface EnvironmentVariables {
  NODE_ENV: NodeEnvironment;
  PORT: number;
  FRONTEND_URL: string;
  DATABASE_URL?: string;
  DIRECT_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_JWT_ISSUER?: string;
  SUPABASE_JWKS_URL?: string;
}

function readNodeEnvironment(value: unknown): NodeEnvironment {
  const nodeEnv = value === undefined || value === '' ? 'development' : value;

  if (
    typeof nodeEnv !== 'string' ||
    !NODE_ENVIRONMENTS.includes(nodeEnv as NodeEnvironment)
  ) {
    throw new Error(
      `NODE_ENV deve ser um destes valores: ${NODE_ENVIRONMENTS.join(', ')}`,
    );
  }

  return nodeEnv as NodeEnvironment;
}

function readPort(value: unknown): number {
  const port = value === undefined || value === '' ? 3333 : Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT deve ser um número inteiro entre 1 e 65535');
  }

  return port;
}

function readFrontendUrl(value: unknown): string {
  const frontendUrl =
    value === undefined || value === '' ? 'http://localhost:3000' : value;

  if (typeof frontendUrl !== 'string') {
    throw new Error('FRONTEND_URL deve ser uma URL válida');
  }

  try {
    const url = new URL(frontendUrl);

    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error();
    }
  } catch {
    throw new Error('FRONTEND_URL deve ser uma URL HTTP ou HTTPS válida');
  }

  return frontendUrl;
}

function readOptionalString(
  config: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = config[key];

  if (value === undefined || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error(`${key} deve ser uma string`);
  }

  return value;
}

export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentVariables {
  return {
    NODE_ENV: readNodeEnvironment(config.NODE_ENV),
    PORT: readPort(config.PORT),
    FRONTEND_URL: readFrontendUrl(config.FRONTEND_URL),
    DATABASE_URL: readOptionalString(config, 'DATABASE_URL'),
    DIRECT_URL: readOptionalString(config, 'DIRECT_URL'),
    SUPABASE_URL: readOptionalString(config, 'SUPABASE_URL'),
    SUPABASE_ANON_KEY: readOptionalString(config, 'SUPABASE_ANON_KEY'),
    SUPABASE_JWT_ISSUER: readOptionalString(config, 'SUPABASE_JWT_ISSUER'),
    SUPABASE_JWKS_URL: readOptionalString(config, 'SUPABASE_JWKS_URL'),
  };
}
