import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  // `!` (definite assignment assertion): satisfies strictPropertyInitialization under
  // "strict": true. class-transformer's plainToInstance (invoked by the global
  // ValidationPipe) sets these fields at runtime — the assertion only silences the
  // compile-time check. Do not remove.
  @ApiProperty()
  @IsString()
  currentPassword!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
