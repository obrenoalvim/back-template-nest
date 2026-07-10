import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateNoteDto {
  // `!` (definite assignment assertion): satisfies strictPropertyInitialization under
  // "strict": true. class-transformer's plainToInstance (invoked by the global
  // ValidationPipe) sets these fields at runtime — the assertion only silences the
  // compile-time check. Do not remove.
  @ApiProperty({ minLength: 1 })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty()
  @IsString()
  content!: string;
}
