import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('PrismaService (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    try {
      await moduleRef.init();
      prisma = moduleRef.get(PrismaService);
    } catch {
      throw new Error('Não foi possível conectar ao PostgreSQL de teste');
    }
  });

  afterAll(async () => {
    await moduleRef?.close();
  });

  it('executa uma consulta simples no banco', async () => {
    try {
      const result: unknown = await prisma.$queryRaw`
        SELECT 1 AS value
      `;

      expect(result).toEqual([{ value: 1 }]);
    } catch {
      throw new Error('A consulta de verificação do PostgreSQL falhou');
    }
  });
});
