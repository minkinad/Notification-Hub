import { EventStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateEventDto {
  @ApiProperty({
    description: 'Project identifier',
    example: 'clx1234567890',
  })
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @ApiProperty({
    description: 'Business event type',
    example: 'user.registered',
  })
  @IsString()
  @MaxLength(120)
  type!: string;

  @ApiProperty({
    description: 'Event payload',
    example: {
      userId: 'usr_123',
      email: 'john@example.com',
    },
  })
  @IsObject()
  data!: Record<string, unknown>;
}

export class EventListQueryDto extends PaginationQueryDto {
  @ApiProperty({
    description: 'Project identifier',
    required: false,
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({
    enum: EventStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;
}
