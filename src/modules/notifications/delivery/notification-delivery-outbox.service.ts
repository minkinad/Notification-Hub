import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@common/prisma/prisma.service';
import { NotificationDeliveryQueueService } from './notification-delivery-queue.service';

@Injectable()
export class NotificationDeliveryOutboxService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(NotificationDeliveryOutboxService.name);
  private interval?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: NotificationDeliveryQueueService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const intervalMs = this.configService.get<number>(
      'DELIVERY_OUTBOX_INTERVAL_MS',
      30000,
    );

    this.interval = setInterval(() => {
      this.enqueueDue().catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Delivery outbox sweep failed: ${message}`);
      });
    }, intervalMs);

    this.interval.unref();
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  async markEnqueued(notificationIds: string[]) {
    if (notificationIds.length === 0) {
      return;
    }

    await this.prisma.deliveryOutbox.deleteMany({
      where: {
        notificationId: {
          in: notificationIds,
        },
      },
    });
  }

  async enqueueDue(limit = 100) {
    const now = new Date();
    const entries = await this.prisma.deliveryOutbox.findMany({
      where: {
        nextAttemptAt: {
          lte: now,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: limit,
    });

    for (const entry of entries) {
      try {
        await this.queueService.enqueue(entry.notificationId);
        await this.markEnqueued([entry.notificationId]);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const nextDelayMs = this.calculateBackoffMs(entry.attempts + 1);

        await this.prisma.deliveryOutbox.update({
          where: {
            id: entry.id,
          },
          data: {
            attempts: {
              increment: 1,
            },
            lastError: message,
            nextAttemptAt: new Date(Date.now() + nextDelayMs),
          },
        });
      }
    }

    return {
      processed: entries.length,
    };
  }

  private calculateBackoffMs(attempts: number) {
    return Math.min(300_000, 10_000 * 2 ** Math.max(0, attempts - 1));
  }
}
