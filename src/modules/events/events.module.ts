import { Module } from '@nestjs/common';
import { AuditModule } from '@common/audit/audit.module';
import { PrismaModule } from '@common/prisma/prisma.module';
import { RateLimitModule } from '@common/rate-limit/rate-limit.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { ProjectsModule } from '@modules/projects/projects.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [
    PrismaModule,
    ProjectsModule,
    NotificationsModule,
    RateLimitModule,
    AuditModule,
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
