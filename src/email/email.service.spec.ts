import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

function fakeConfig(values: Record<string, unknown> = {}): ConfigService {
  return {
    get: (key: string, def?: unknown) => values[key] ?? def,
  } as unknown as ConfigService;
}

describe('EmailService', () => {
  it('logs to the console instead of sending when SMTP_HOST is not set', async () => {
    const service = new EmailService(
      fakeConfig({ APP_URL: 'http://localhost:3000' }),
    );
    const logSpy = jest.spyOn(
      (service as unknown as { logger: { log: jest.Mock } }).logger,
      'log',
    );

    await service.sendVerificationEmail('user@example.com', 'tok123');

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('user@example.com'),
    );
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('tok123'));
  });

  it('builds a verification link using APP_URL and the given token', async () => {
    const service = new EmailService(
      fakeConfig({ APP_URL: 'http://localhost:3000' }),
    );
    const logSpy = jest.spyOn(
      (service as unknown as { logger: { log: jest.Mock } }).logger,
      'log',
    );

    await service.sendVerificationEmail('user@example.com', 'tok123');

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'http://localhost:3000/api/auth/verify-email?token=tok123',
      ),
    );
  });
});
