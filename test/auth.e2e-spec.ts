import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './utils/create-test-app';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `auth-e2e-${Date.now()}@example.com`;
  const password = 'correct-horse-battery-staple';

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('registers a new user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password })
      .expect(201);

    expect(res.body).toMatchObject({ email });
  });

  it('rejects a second registration with the same email', async () => {
    await request(app.getHttpServer()).post('/api/auth/register').send({ email, password }).expect(409);
  });

  it('logs in with correct credentials and receives a JWT', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(201);

    expect(res.body.accessToken).toEqual(expect.any(String));
  });

  it('rejects login with the wrong password', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401);
  });

  it('verifies the email using the token stored in the database', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const verification = await prisma.verificationToken.findFirstOrThrow({ where: { userId: user.id } });

    await request(app.getHttpServer())
      .get(`/api/auth/verify-email?token=${verification.token}`)
      .expect(200);

    const updated = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(updated.emailVerified).toBe(true);
  });

  it('resets the password end to end via forgot-password + reset-password', async () => {
    await request(app.getHttpServer()).post('/api/auth/forgot-password').send({ email }).expect(201);

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const reset = await prisma.passwordResetToken.findFirstOrThrow({ where: { userId: user.id } });

    await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .send({ token: reset.token, newPassword: 'a-brand-new-password123' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'a-brand-new-password123' })
      .expect(201);
  });
});
