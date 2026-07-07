import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const validConfig = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    JWT_SECRET: 'a'.repeat(32),
  };

  it('accepts a valid config and fills in defaults', () => {
    const result = validateEnv(validConfig);
    expect(result.NODE_ENV).toBe('development');
    expect(result.PORT).toBe(3000);
    expect(result.LOG_LEVEL).toBe('info');
    expect(result.THROTTLE_TTL).toBe(60);
    expect(result.THROTTLE_LIMIT).toBe(100);
  });

  it('throws when DATABASE_URL is missing', () => {
    const { DATABASE_URL: _drop, ...rest } = validConfig;
    expect(() => validateEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it('throws when JWT_SECRET is shorter than 32 characters', () => {
    expect(() => validateEnv({ ...validConfig, JWT_SECRET: 'too-short' })).toThrow(
      /JWT_SECRET/,
    );
  });

  it('allows unrelated env vars through untouched (e.g. POSTGRES_* used only by docker-compose)', () => {
    expect(() => validateEnv({ ...validConfig, POSTGRES_USER: 'postgres' })).not.toThrow();
  });
});
