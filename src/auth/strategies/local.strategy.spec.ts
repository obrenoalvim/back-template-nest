import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from './local.strategy';
import { AuthService } from '../auth.service';

describe('LocalStrategy', () => {
  let authService: jest.Mocked<Pick<AuthService, 'validateUser'>>;
  let strategy: LocalStrategy;

  beforeEach(() => {
    authService = { validateUser: jest.fn() };
    strategy = new LocalStrategy(authService as unknown as AuthService);
  });

  it('returns the authenticated user when credentials are valid', async () => {
    authService.validateUser.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.com',
      role: 'user',
    });

    const result = await strategy.validate('a@b.com', 'password123');

    expect(result).toEqual({ id: 'user-1', email: 'a@b.com', role: 'user' });
  });

  it('throws UnauthorizedException when credentials are wrong', async () => {
    authService.validateUser.mockResolvedValue(null);

    // Password must satisfy LoginDto's MinLength(8) so this test exercises the
    // credentials-wrong path (delegated to AuthService), not DTO validation.
    await expect(strategy.validate('a@b.com', 'wrongpassword')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws BadRequestException before calling validateUser when the body fails LoginDto validation', async () => {
    await expect(
      strategy.validate('not-an-email', 'password123'),
    ).rejects.toThrow(BadRequestException);
    expect(authService.validateUser).not.toHaveBeenCalled();
  });
});
