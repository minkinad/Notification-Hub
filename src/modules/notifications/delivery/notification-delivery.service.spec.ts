import {
  ChannelType,
  DeliveryStatus,
  EventStatus,
  NotificationStatus,
} from '@prisma/client';
import { NotificationDeliveryService } from './notification-delivery.service';

describe('NotificationDeliveryService', () => {
  const tx = {
    notification: {
      update: jest.fn(),
      count: jest.fn(),
    },
    deliveryLog: {
      create: jest.fn(),
    },
    event: {
      update: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn(),
    notification: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
  } as any;
  const queueService = {
    enqueue: jest.fn(),
  };

  let service: NotificationDeliveryService;

  beforeEach(() => {
    jest.clearAllMocks();
    tx.notification.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    prisma.$transaction.mockImplementation((callback: any) =>
      Promise.resolve(callback(tx)),
    );
    service = new NotificationDeliveryService(prisma, queueService as any);
  });

  it('marks mock-delivered notifications as sent and completes the event', async () => {
    prisma.notification.findUnique.mockResolvedValue({
      id: 'notification-1',
      projectId: 'project-1',
      eventId: 'event-1',
      status: NotificationStatus.PENDING,
      retryCount: 0,
      maxRetries: 3,
      recipient: 'alerts@example.com',
      subject: 'Notification for invoice.created',
      template: 'invoice.created',
      templateData: { invoiceId: 'inv-1' },
      createdAt: new Date(),
      channel: {
        type: ChannelType.EMAIL,
        config: { to: 'alerts@example.com' },
      },
      event: {
        id: 'event-1',
      },
    });
    prisma.notification.updateMany.mockResolvedValue({ count: 1 });

    await service.deliver('notification-1');

    expect(tx.notification.update).toHaveBeenCalledWith({
      where: {
        id: 'notification-1',
      },
      data: expect.objectContaining({
        status: NotificationStatus.SENT,
      }),
    });
    expect(tx.deliveryLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        notificationId: 'notification-1',
        status: DeliveryStatus.SUCCESS,
      }),
    });
    expect(tx.event.update).toHaveBeenCalledWith({
      where: {
        id: 'event-1',
      },
      data: {
        status: EventStatus.COMPLETED,
      },
    });
  });
});
