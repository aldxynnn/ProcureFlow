import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('ProcureFlow API', () => {
  let app: INestApplication;
  beforeAll(async () => {
    process.env.JWT_SECRET ||= 'test-secret'; process.env.JWT_REFRESH_SECRET ||= 'test-refresh'; process.env.REDIS_URL ||= 'redis://localhost:6379'; process.env.DATABASE_URL ||= 'postgresql://procureflow:procureflow@localhost:5432/procureflow?schema=public'; process.env.FRONTEND_ORIGIN ||= 'http://localhost:3000';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication(); await app.init();
  });
  afterAll(async () => { await app.close(); });
  it('exposes health', async () => { await request(app.getHttpServer()).get('/health').expect(200).expect(({ body }) => expect(body.status).toBe('ok')); });
});
