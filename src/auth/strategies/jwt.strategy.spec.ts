import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

function fakeConfig(values: Record<string, unknown>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

describe('JwtStrategy', () => {
  it('maps a decoded payload to an AuthenticatedUser', () => {
    const strategy = new JwtStrategy(
      fakeConfig({ JWT_SECRET: 'a'.repeat(32) }),
    );

    const result = strategy.validate({ sub: 'user-1', email: 'a@b.com' });

    expect(result).toEqual({ id: 'user-1', email: 'a@b.com' });
  });
});
