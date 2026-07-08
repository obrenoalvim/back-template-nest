import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  // `!`: see RegisterDto's comment — required under strictPropertyInitialization,
  // harmless at runtime since class-transformer sets this field via the ValidationPipe.
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
