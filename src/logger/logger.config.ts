import { ConfigService } from '@nestjs/config';
import { Params } from 'nestjs-pino';
import { Options } from 'pino-http';

// Params.pinoHttp is typed as a union (Options | DestinationStream | [Options, DestinationStream])
// in nestjs-pino's .d.ts; narrowed to Options here so strict mode allows accessing .transport
// on the returned value (e.g. in tests). Do not simplify back to plain Params.
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
