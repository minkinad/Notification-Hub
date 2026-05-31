import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({
    description: 'Human-readable API key name',
    example: 'Production ingest key',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @ApiProperty({
    description: 'Optional ISO expiration timestamp',
    required: false,
    example: '2026-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiProperty({
    description: 'Optional key scopes',
    required: false,
    example: ['events:ingest'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @ApiProperty({
    description: 'Optional per-key ingest request limit',
    required: false,
    example: 500,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  rateLimit?: number;

  @ApiProperty({
    description: 'Optional per-key ingest rate limit window in seconds',
    required: false,
    example: 3600,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  rateLimitWindow?: number;
}
