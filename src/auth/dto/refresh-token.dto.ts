import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  // `!`: see RegisterDto's comment — required under strictPropertyInitialization,
  // harmless at runtime since class-transformer sets this field via the ValidationPipe.
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}
