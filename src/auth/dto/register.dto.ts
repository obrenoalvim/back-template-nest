import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  // `!` (definite assignment assertion): satisfies strictPropertyInitialization under
  // "strict": true. class-transformer's plainToInstance (invoked by the global
  // ValidationPipe) sets these fields at runtime — the assertion only silences the
  // compile-time check. Do not remove.
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
