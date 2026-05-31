import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NotificationStatus } from '@prisma/client';
import { NotificationListQueryDto } from './notification-list.dto';

describe('NotificationListQueryDto', () => {
  it('allows pagination query parameters under strict validation', async () => {
    const query = plainToInstance(NotificationListQueryDto, {
      projectId: 'project-1',
      status: NotificationStatus.PENDING,
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
