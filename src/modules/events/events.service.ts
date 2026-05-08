import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChannelType, EventStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { ProjectsService } from '@modules/projects/projects.service';
import { CreateEventDto, EventListQueryDto } from './dto/create-event.dto';
import { IngestEventDto } from './dto/ingest-event.dto';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
  ) {}

  async create(userId: string, createEventDto: CreateEventDto) {
    await this.projectsService.ensureOwnedProject(
      createEventDto.projectId,
      userId,
    );

    return this.createEventRecord(createEventDto.projectId, {
      type: createEventDto.type,
      data: createEventDto.data,
    });
  }

  async ingest(apiKey: string, ingestEventDto: IngestEventDto) {
    const project = await this.projectsService.verifyApiKey(apiKey);

    if (!project) {
      throw new BadRequestException('Invalid or inactive project API key');
    }

    return this.createEventRecord(project.id, ingestEventDto);
  }

  async findAll(userId: string, query: EventListQueryDto, skip = 0, take = 10) {
    const normalizedTake = Math.min(Math.max(take, 1), 100);
    const where: Prisma.EventWhereInput = {
      project: {
        userId,
      },
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: normalizedTake,
        orderBy: { createdAt: 'desc' },
        include: {
          notifications: {
            select: {
              id: true,
              status: true,
              channelId: true,
              recipient: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data: events,
      total,
      skip,
      take: normalizedTake,
    };
  }

  async findOne(id: string, userId: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id,
        project: {
          userId,
        },
      },
      include: {
        notifications: {
          include: {
            channel: {
              select: {
                id: true,
                type: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  private async createEventRecord(
    projectId: string,
    payload: { type: string; data: Record<string, unknown> },
  ) {
    const channels = await this.prisma.notificationChannel.findMany({
      where: {
        projectId,
        active: true,
      },
    });

    const event = await this.prisma.event.create({
      data: {
        projectId,
        type: payload.type,
        data: payload.data as Prisma.InputJsonValue,
        status:
          channels.length > 0 ? EventStatus.PROCESSING : EventStatus.PENDING,
      },
    });

    if (channels.length > 0) {
      await this.prisma.notification.createMany({
        data: channels.map((channel) => ({
          projectId,
          eventId: event.id,
          channelId: channel.id,
          recipient: this.resolveRecipient(channel.type, channel.config),
          subject: this.resolveSubject(channel.type, payload.type),
          template: payload.type,
          templateData: payload.data as Prisma.InputJsonValue,
        })),
      });
    }

    return {
      ...event,
      notificationsCreated: channels.length,
    };
  }

  private resolveRecipient(
    channelType: ChannelType,
    config: Prisma.JsonValue,
  ): string {
    const typedConfig = this.asRecord(config);

    if (channelType === ChannelType.EMAIL) {
      return String(
        typedConfig.to ?? typedConfig.email ?? 'unconfigured-email',
      );
    }

    if (channelType === ChannelType.TELEGRAM) {
      return String(
        typedConfig.chatId ?? typedConfig.username ?? 'unconfigured-chat',
      );
    }

    if (channelType === ChannelType.WEBHOOK) {
      return String(typedConfig.url ?? 'unconfigured-webhook');
    }

    return String(typedConfig.phone ?? 'unconfigured-recipient');
  }

  private resolveSubject(
    channelType: ChannelType,
    eventType: string,
  ): string | null {
    if (channelType === ChannelType.WEBHOOK) {
      return null;
    }

    return `Notification for ${eventType}`;
  }

  private asRecord(value: Prisma.JsonValue): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
  }
}
