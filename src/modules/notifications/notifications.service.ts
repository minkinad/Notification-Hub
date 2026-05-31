import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { NotificationStatus, Prisma } from '@prisma/client';
import { AuditService } from '@common/audit/audit.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { normalizePagination } from '@common/utils/pagination';
import { NotificationDeliveryQueueService } from './delivery/notification-delivery-queue.service';
import { NotificationListQueryDto } from './dto/notification-list.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    private readonly queueService?: NotificationDeliveryQueueService,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  async findAll(
    userId: string,
    query: NotificationListQueryDto,
    skip = 0,
    take = 10,
  ) {
    const pagination = normalizePagination({ skip, take });
    const where: Prisma.NotificationWhereInput = {
      project: {
        userId,
      },
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: 'desc' },
        include: {
          channel: {
            select: {
              id: true,
              type: true,
              name: true,
            },
          },
          event: {
            select: {
              id: true,
              type: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      total,
      skip: pagination.skip,
      take: pagination.take,
    };
  }

  async findOne(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        project: {
          userId,
        },
      },
      include: {
        channel: {
          select: {
            id: true,
            type: true,
            name: true,
          },
        },
        event: {
          select: {
            id: true,
            type: true,
            status: true,
          },
        },
        deliveryLogs: {
          orderBy: {
            attemptedAt: 'desc',
          },
        },
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async retry(id: string, userId: string) {
    const notification = await this.findOne(id, userId);

    if (notification.status === NotificationStatus.SENT) {
      throw new BadRequestException(
        'Delivered notifications cannot be retried',
      );
    }

    if (notification.status === NotificationStatus.PROCESSING) {
      throw new BadRequestException(
        'Processing notifications cannot be retried',
      );
    }

    if (notification.retryCount >= notification.maxRetries) {
      throw new BadRequestException('Maximum retry count has been reached');
    }

    const nextRetryAt = new Date(Date.now() + 60_000);
    const updatedNotification = await this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.RETRYING,
        retryCount: {
          increment: 1,
        },
        nextRetryAt,
        lastError: null,
      },
      include: {
        channel: {
          select: {
            id: true,
            type: true,
            name: true,
          },
        },
        event: {
          select: {
            id: true,
            type: true,
            status: true,
          },
        },
      },
    });

    await this.queueService?.enqueue(id, 60_000);
    await this.auditService?.log({
      userId,
      projectId: updatedNotification.projectId,
      action: 'notification.retry',
      resource: 'notification',
      details: {
        notificationId: id,
        retryCount: updatedNotification.retryCount,
        nextRetryAt: nextRetryAt.toISOString(),
      },
    });

    return updatedNotification;
  }
}
