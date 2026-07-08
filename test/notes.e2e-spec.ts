import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './utils/create-test-app';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Notes (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `notes-e2e-${Date.now()}@example.com`;
  const password = 'correct-horse-battery-staple';
  let accessToken: string;
  let noteId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());

    await request(app.getHttpServer()).post('/api/auth/register').send({ email, password });
    const loginRes = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password });
    accessToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer()).get('/api/notes').expect(401);
  });

  it('creates a note owned by the authenticated user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/notes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'First note', content: 'Hello' })
      .expect(201);

    expect(res.body).toMatchObject({ title: 'First note', content: 'Hello' });
    noteId = res.body.id;
  });

  it('lists the user\'s notes', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/notes')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
  });

  it('updates the note', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Updated title' })
      .expect(200);

    expect(res.body.title).toBe('Updated title');
  });

  it('deletes the note', async () => {
    await request(app.getHttpServer())
      .delete(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });
});
