import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from '../src/auth/auth.module';
import { SupabaseJwtService } from '../src/auth/supabase-jwt.service';

describe('Supabase authentication (e2e)', () => {
  const user = {
    id: 'auth-user-id',
    email: 'personal@example.com',
    role: 'authenticated',
  };
  let app: INestApplication<App>;
  let supabaseJwtService: {
    validateAccessToken: jest.Mock;
  };

  beforeEach(async () => {
    supabaseJwtService = {
      validateAccessToken: jest.fn().mockResolvedValue(user),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(SupabaseJwtService)
      .useValue(supabaseJwtService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/auth/test retorna 401 sem Bearer token', async () => {
    await request(app.getHttpServer()).get('/api/auth/test').expect(401);

    expect(supabaseJwtService.validateAccessToken).not.toHaveBeenCalled();
  });

  it('GET /api/auth/test retorna o usuário de um token válido', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/test')
      .set('Authorization', 'Bearer valid-access-token')
      .expect(200)
      .expect({
        authenticated: true,
        user,
      });

    expect(supabaseJwtService.validateAccessToken).toHaveBeenCalledWith(
      'valid-access-token',
    );
  });
});
