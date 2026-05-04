import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { NotificationListQueryDto } from './dto/notification-list.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    query: NotificationListQueryDto,
    skip = 0,
    take = 10,
  ) {
    const normalizedTake = Math.min(Math.max(take, 1), 100);
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
        skip,
        take: normalizedTake,
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
      skip,
      take: normalizedTake,
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
      throw new BadRequestException('Delivered notifications cannot be retried');
    }

    if (notification.retryCount >= notification.maxRetries) {
      throw new BadRequestException('Maximum retry count has been reached');
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.RETRYING,
        retryCount: {
          increment: 1,
        },
        nextRetryAt: new Date(Date.now() + 60_000),
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
  }
}
