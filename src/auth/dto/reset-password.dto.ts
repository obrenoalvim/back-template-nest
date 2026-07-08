import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  // `!`: see RegisterDto's comment — required under strictPropertyInitialization,
  // harmless at runtime since class-transformer sets this field via the ValidationPipe.
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}
