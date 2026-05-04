import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString, MaxLength } from 'class-validator';

export class IngestEventDto {
  @ApiProperty({
    description: 'Business event type',
    example: 'invoice.created',
  })
  @IsString()
  @MaxLength(120)
  type!: string;

  @ApiProperty({
    description: 'Event payload',
    example: {
      invoiceId: 'inv_123',
      amount: 1500,
    },
  })
  @IsObject()
  data!: Record<string, unknown>;
}
