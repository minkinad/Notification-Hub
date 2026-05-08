import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ChannelListQueryDto {
  @ApiProperty({
    description: 'Project identifier',
    example: 'clx1234567890',
  })
  @IsString()
  @IsNotEmpty()
  projectId!: string;
}
