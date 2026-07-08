import { IsString } from 'class-validator';

export class VerifyEmailDto {
  // `!`: see RegisterDto's comment — required under strictPropertyInitialization,
  // harmless at runtime since class-transformer sets this field via the ValidationPipe.
  @IsString()
  token!: string;
}
