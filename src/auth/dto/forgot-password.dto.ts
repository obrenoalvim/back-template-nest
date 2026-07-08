import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  // `!`: see RegisterDto's comment — required under strictPropertyInitialization,
  // harmless at runtime since class-transformer sets this field via the ValidationPipe.
  @IsEmail()
  email!: string;
}
