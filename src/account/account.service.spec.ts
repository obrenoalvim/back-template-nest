import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AccountService } from './account.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AccountService', () => {
  let prisma: jest.Mocked<Pick<PrismaService, 'user'>>;
  let service: AccountService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      } as unknown as PrismaService['user'],
    } as unknown as jest.Mocked<Pick<PrismaService, 'user'>>;

    service = new AccountService(prisma as unknown as PrismaService);
  });

  describe('changePassword', () => {
    it('updates the password when the current password matches', async () => {
      const hashed = await bcrypt.hash('old-password123', 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1', password: hashed });

      const result = await service.changePassword('user-1', {
        currentPassword: 'old-password123',
        newPassword: 'new-password123',
      });

      expect(result).toEqual({ changed: true });
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } }),
      );
    });

    it('throws when the current password is wrong', async () => {
      const hashed = await bcrypt.hash('old-password123', 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1', password: hashed });

      await expect(
        service.changePassword('user-1', { currentPassword: 'wrong', newPassword: 'new-password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('deleteAccount', () => {
    it('deletes the user when the password matches', async () => {
      const hashed = await bcrypt.hash('password123', 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1', password: hashed });

      const result = await service.deleteAccount('user-1', 'password123');

      expect(result).toEqual({ deleted: true });
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    });

    it('throws when the password is wrong', async () => {
      const hashed = await bcrypt.hash('password123', 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1', password: hashed });

      await expect(service.deleteAccount('user-1', 'wrong')).rejects.toThrow(UnauthorizedException);
    });
  });
});
