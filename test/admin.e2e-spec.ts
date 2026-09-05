import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './utils/create-test-app';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Admin notes (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `admin-notes-e2e-${Date.now()}@example.com`;
  const password = 'correct-horse-battery-staple';
  let accessToken: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password });

    // No admin-creation endpoint exists yet, so promote directly in the DB —
    // has to happen before login, since the role is baked into the JWT at
    // sign-in time.
    await prisma.user.update({ where: { email }, data: { role: 'admin' } });

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password });
    accessToken = loginRes.body.accessToken;

    const owner = await prisma.user.findUniqueOrThrow({ where: { email } });
    await prisma.note.createMany({
      data: Array.from({ length: 4 }, (_, i) => ({
        title: `Note ${i}`,
        content: `Content ${i}`,
        userId: owner.id,
      })),
    });
  });

  afterAll(async () => {
    await prisma.note.deleteMany({ where: { user: { email } } });
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('lists notes with their owner email in a query count that stays flat, not one-plus-N', async () => {
    let queryCount = 0;
    prisma.$on('query', () => {
      queryCount++;
    });

    const res = await request(app.getHttpServer())
      .get('/api/admin/notes')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const notes: Array<{ user?: { email: string } }> = res.body;
    const ownNotes = notes.filter((n) => n.user?.email === email);
    expect(ownNotes).toHaveLength(4);
    expect(ownNotes.every((n) => n.user?.email === email)).toBe(true);

    // Prisma's default relation strategy for `include` here is two queries —
    // one for notes, one batched WHERE-IN for their owners — not one per note.
    // That count stays flat regardless of how many notes exist; a regression
    // back to a per-note query in a loop would make this grow with N instead.
    expect(queryCount).toBe(2);
  });
});
