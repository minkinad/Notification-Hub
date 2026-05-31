import { BadRequestException } from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const prisma = {
    notification: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  } as any;

  const queueService = {
    enqueue: jest.fn(),
  };

  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(prisma, queueService as any);
  });

  it('rejects retry for delivered notifications', async () => {
    prisma.notification.findFirst.mockResolvedValue({
      id: 'notification-1',
      status: NotificationStatus.SENT,
    });

    await expect(
      service.retry('notification-1', 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('schedules retry through the delivery queue', async () => {
    prisma.notification.findFirst.mockResolvedValue({
      id: 'notification-1',
      projectId: 'project-1',
      status: NotificationStatus.FAILED,
      retryCount: 0,
      maxRetries: 3,
      channel: {
        id: 'channel-1',
        type: 'WEBHOOK',
        name: 'Webhook',
      },
      event: {
        id: 'event-1',
        type: 'invoice.created',
        status: 'FAILED',
      },
      deliveryLogs: [],
    });
    prisma.notification.update.mockResolvedValue({
      id: 'notification-1',
      projectId: 'project-1',
      status: NotificationStatus.RETRYING,
      retryCount: 1,
      maxRetries: 3,
      nextRetryAt: new Date(),
      channel: {
        id: 'channel-1',
        type: 'WEBHOOK',
        name: 'Webhook',
      },
      event: {
        id: 'event-1',
        type: 'invoice.created',
        status: 'FAILED',
      },
    });

    const result = await service.retry('notification-1', 'user-1');

    expect(prisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'notification-1',
        },
        data: expect.objectContaining({
          status: NotificationStatus.RETRYING,
          retryCount: {
            increment: 1,
          },
        }),
      }),
    );
    expect(queueService.enqueue).toHaveBeenCalledWith('notification-1', 60_000);
    expect(result.status).toBe(NotificationStatus.RETRYING);
  });
});
