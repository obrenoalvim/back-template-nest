import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { AuthenticatedUser } from './types/authenticated-user.type';

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async issueTokenPair(user: AuthenticatedUser): Promise<TokenPair> {
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = randomBytes(32).toString('hex');
    const refreshDays = this.config.get<number>('JWT_REFRESH_EXPIRES_DAYS', 30);
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: this.hashToken(refreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto): Promise<{ id: string; email: string }> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email: dto.email, password: hashed },
    });

    const token = randomBytes(32).toString('hex');
    await this.prisma.verificationToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
      },
    });
    await this.emailService.sendVerificationEmail(user.email, token);

    return { id: user.id, email: user.email };
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    const matches = await bcrypt.compare(password, user.password);
    if (!matches) return null;

    return { id: user.id, email: user.email, role: user.role };
  }

  async login(user: AuthenticatedUser): Promise<TokenPair> {
    return this.issueTokenPair(user);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const tokenHash = this.hashToken(refreshToken);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotation: the old token is deleted the moment it's used, so a stolen-and-replayed
    // refresh token stops working after the legitimate client's next refresh.
    await this.prisma.refreshToken.delete({ where: { tokenHash } });

    return this.issueTokenPair({
      id: record.user.id,
      email: record.user.email,
      role: record.user.role,
    });
  }

  async logout(refreshToken: string): Promise<{ loggedOut: true }> {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken
      .delete({ where: { tokenHash } })
      .catch(() => undefined); // already gone/invalid — logout is idempotent, don't leak
    return { loggedOut: true };
  }

  async verifyEmail(token: string): Promise<{ verified: true }> {
    const record = await this.prisma.verificationToken.findUnique({
      where: { token },
    });
    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: true },
      }),
      this.prisma.verificationToken.delete({ where: { token } }),
    ]);

    return { verified: true };
  }

  async forgotPassword(email: string): Promise<{ sent: true }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always report success — don't let this endpoint reveal which emails are registered.
    if (!user) {
      return { sent: true };
    }

    const token = randomBytes(32).toString('hex');
    await this.prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
      },
    });
    await this.emailService.sendPasswordResetEmail(user.email, token);

    return { sent: true };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ reset: true }> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });
    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { password: hashed },
      }),
      this.prisma.passwordResetToken.delete({ where: { token } }),
    ]);

    return { reset: true };
  }
}
