import { ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

describe('AuthService', () => {
  let prisma: jest.Mocked<
    Pick<
      PrismaService,
      'user' | 'verificationToken' | 'passwordResetToken' | '$transaction'
    >
  >;
  let emailService: jest.Mocked<EmailService>;
  let jwtService: jest.Mocked<JwtService>;
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      } as unknown as PrismaService['user'],
      verificationToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      } as unknown as PrismaService['verificationToken'],
      passwordResetToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      } as unknown as PrismaService['passwordResetToken'],
      $transaction: jest.fn((ops: unknown[]) =>
        Promise.all(ops as Promise<unknown>[]),
      ),
    } as unknown as jest.Mocked<
      Pick<
        PrismaService,
        'user' | 'verificationToken' | 'passwordResetToken' | '$transaction'
      >
    >;

    emailService = {
      sendVerificationEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
    } as unknown as jest.Mocked<EmailService>;

    jwtService = {
      sign: jest.fn().mockReturnValue('signed-jwt'),
    } as unknown as jest.Mocked<JwtService>;

    service = new AuthService(
      prisma as unknown as PrismaService,
      emailService,
      jwtService,
    );
  });

  describe('register', () => {
    it('creates a user, a verification token, and sends the verification email', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'a@b.com',
      });

      const result = await service.register({
        email: 'a@b.com',
        password: 'password123',
      });

      expect(result).toEqual({ id: 'user-1', email: 'a@b.com' });
      expect(prisma.verificationToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-1' }),
        }),
      );
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        'a@b.com',
        expect.any(String),
      );
    });

    it('rejects registration when the email is already taken', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing',
        email: 'a@b.com',
      });

      await expect(
        service.register({ email: 'a@b.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('validateUser', () => {
    it('returns the user when the password matches', async () => {
      const hashed = await bcrypt.hash('password123', 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'a@b.com',
        password: hashed,
      });

      const result = await service.validateUser('a@b.com', 'password123');

      expect(result).toEqual({ id: 'user-1', email: 'a@b.com' });
    });

    it('returns null when the password does not match', async () => {
      const hashed = await bcrypt.hash('password123', 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'a@b.com',
        password: hashed,
      });

      const result = await service.validateUser('a@b.com', 'wrong-password');

      expect(result).toBeNull();
    });

    it('returns null when no user exists for the email', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.validateUser('missing@b.com', 'password123');

      expect(result).toBeNull();
    });
  });

  describe('verifyEmail', () => {
    it('marks the user verified and deletes the token when the token is valid and unexpired', async () => {
      (prisma.verificationToken.findUnique as jest.Mock).mockResolvedValue({
        token: 'tok',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 60_000),
      });

      const result = await service.verifyEmail('tok');

      expect(result).toEqual({ verified: true });
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('throws when the token does not exist', async () => {
      (prisma.verificationToken.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.verifyEmail('missing')).rejects.toThrow();
    });

    it('throws when the token has expired', async () => {
      (prisma.verificationToken.findUnique as jest.Mock).mockResolvedValue({
        token: 'tok',
        userId: 'user-1',
        expiresAt: new Date(Date.now() - 60_000),
      });

      await expect(service.verifyEmail('tok')).rejects.toThrow();
    });
  });
});
