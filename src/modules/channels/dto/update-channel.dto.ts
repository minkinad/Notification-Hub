import { ChannelType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateChannelDto {
  @ApiProperty({
    enum: ChannelType,
    description: 'Notification channel type',
    required: false,
  })
  @IsOptional()
  @IsEnum(ChannelType)
  type?: ChannelType;

  @ApiProperty({
    description: 'Display name for the channel',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiProperty({
    description: 'Channel-specific configuration payload',
    required: false,
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiProperty({
    description: 'Whether channel is active',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
