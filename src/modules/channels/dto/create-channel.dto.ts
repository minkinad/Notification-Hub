import { ChannelType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateChannelDto {
  @ApiProperty({
    description: 'Project identifier',
    example: 'clx1234567890',
  })
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @ApiProperty({
    enum: ChannelType,
    description: 'Notification channel type',
    example: ChannelType.EMAIL,
  })
  @IsEnum(ChannelType)
  type!: ChannelType;

  @ApiProperty({
    description: 'Display name for the channel',
    example: 'Primary email channel',
  })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    description: 'Channel-specific configuration payload',
    example: {
      to: 'alerts@example.com',
      from: 'noreply@example.com',
    },
  })
  @IsObject()
  config!: Record<string, unknown>;

  @ApiProperty({
    description: 'Whether channel is active',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
