import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateApiKeyDto } from './create-api-key.dto';

export class UpdateApiKeyDto extends PartialType(CreateApiKeyDto) {
  @ApiProperty({
    description: 'Whether the API key is active',
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
