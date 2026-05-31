import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';

export class PaginationQueryDto {
  @ApiProperty({
    description: 'Number of records to skip',
    required: false,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  skip?: number;

  @ApiProperty({
    description: 'Maximum number of records to return',
    required: false,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  take?: number;
}
