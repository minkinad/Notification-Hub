import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EventStatus } from '@prisma/client';
import { EventListQueryDto } from './create-event.dto';

describe('EventListQueryDto', () => {
  it('allows pagination query parameters under strict validation', async () => {
    const query = plainToInstance(EventListQueryDto, {
      projectId: 'project-1',
      status: EventStatus.PENDING,
      skip: '5',
      take: '25',
    });

    const errors = await validate(query, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toEqual([]);
    expect(query.skip).toBe(5);
    expect(query.take).toBe(25);
  });
});
