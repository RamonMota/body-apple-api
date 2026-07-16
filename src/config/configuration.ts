const DEFAULT_PORT = 3333;
const DEFAULT_FRONTEND_URL = 'http://localhost:3000';

export default function configuration() {
  return {
    frontendUrl: process.env.FRONTEND_URL ?? DEFAULT_FRONTEND_URL,
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? DEFAULT_PORT),
  };
}

export type AppConfiguration = ReturnType<typeof configuration>;
