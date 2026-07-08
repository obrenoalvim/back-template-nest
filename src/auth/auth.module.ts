import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
// `jsonwebtoken`'s SignOptions.expiresIn (the type @nestjs/jwt's JwtModuleOptions delegates to)
// is typed as `StringValue | number` (StringValue from `ms`, a template-literal duration type)
// as of a newer @nestjs/jwt/jsonwebtoken than this plan assumed. ConfigService.get returns a
// plain `string`, so it's narrowed here — JWT_EXPIRES_IN is validated as a string by Joi
// (src/config/env.validation.ts) but not against this literal-union shape.
import type { StringValue } from 'ms';
import { EmailModule } from '../email/email.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [
    EmailModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '15m') as StringValue,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule {}
