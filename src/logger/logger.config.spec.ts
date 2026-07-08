import { ConfigService } from '@nestjs/config';
import { createLoggerOptions } from './logger.config';

function fakeConfig(values: Record<string, unknown>): ConfigService {
  return {
    get: (key: string, def?: unknown) => values[key] ?? def,
  } as unknown as ConfigService;
}

describe('createLoggerOptions', () => {
  it('uses the LOG_LEVEL env var as the pino level', () => {
    const options = createLoggerOptions(
      fakeConfig({ LOG_LEVEL: 'debug', NODE_ENV: 'production' }),
    );
    expect(options.pinoHttp).toMatchObject({ level: 'debug' });
  });

  it('enables pino-pretty transport outside production', () => {
    const options = createLoggerOptions(
      fakeConfig({ LOG_LEVEL: 'info', NODE_ENV: 'development' }),
    );
    expect(options.pinoHttp.transport).toEqual(
      expect.objectContaining({ target: 'pino-pretty' }),
    );
  });

  it('disables pino-pretty transport in production (structured JSON)', () => {
    const options = createLoggerOptions(
      fakeConfig({ LOG_LEVEL: 'info', NODE_ENV: 'production' }),
    );
    expect(options.pinoHttp.transport).toBeUndefined();
  });
});
