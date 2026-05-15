import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MockGuard } from './utils/mock.guard';
import { TestHelper } from './utils/test-helper';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await TestHelper.createApp(MockGuard);
    app = result.app;
  });

  afterAll(async () => {
    await TestHelper.closeApp(app);
  });

  it('GET / should return welcome message', async () => {
    const res = await request(app.getHttpServer()).get('/').expect(200);
    expect(res.text).toBe('Welcome to DocAi! ');
  });

  afterAll(async () => {
    await TestHelper.closeApp(app);
  });
});
