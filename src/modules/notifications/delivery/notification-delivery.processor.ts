import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  NOTIFICATION_DELIVERY_QUEUE,
  NotificationDeliveryJob,
} from './notification-delivery.constants';
import { NotificationDeliveryService } from './notification-delivery.service';

@Injectable()
@Processor(NOTIFICATION_DELIVERY_QUEUE)
export class NotificationDeliveryProcessor extends WorkerHost {
  constructor(private readonly deliveryService: NotificationDeliveryService) {
    super();
  }

  async process(job: Job<NotificationDeliveryJob>) {
    return this.deliveryService.deliver(job.data.notificationId);
  }
}
