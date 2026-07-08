import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  it('returns ok when the database query succeeds', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ ok: 1 }]),
    } as unknown as PrismaService;
    const controller = new HealthController(prisma);

    const result = await controller.check();

    expect(result).toEqual({ status: 'ok', database: 'up' });
  });

  it('throws ServiceUnavailableException when the database query fails', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('connection refused')),
    } as unknown as PrismaService;
    const controller = new HealthController(prisma);

    await expect(controller.check()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
