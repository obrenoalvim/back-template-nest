import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class DeleteAccountDto {
  // `!` (definite assignment assertion): satisfies strictPropertyInitialization under
  // "strict": true. class-transformer's plainToInstance (invoked by the global
  // ValidationPipe) sets these fields at runtime — the assertion only silences the
  // compile-time check. Do not remove.
  @ApiProperty()
  @IsString()
  password!: string;
}
