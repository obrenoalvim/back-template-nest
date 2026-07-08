import { ConfigService } from '@nestjs/config';
import { Params } from 'nestjs-pino';
import { Options } from 'pino-http';

export function createLoggerOptions(
  config: ConfigService,
): Params & { pinoHttp: Options } {
  const isProd = config.get<string>('NODE_ENV') === 'production';
  return {
    pinoHttp: {
      level: config.get<string>('LOG_LEVEL', 'info'),
      transport: isProd
        ? undefined
        : {
            target: 'pino-pretty',
            options: { colorize: true, singleLine: true },
          },
    },
  };
}
