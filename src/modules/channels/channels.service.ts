import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { ProjectsService } from '@modules/projects/projects.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@Injectable()
export class ChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
  ) {}

  async create(userId: string, createChannelDto: CreateChannelDto) {
    await this.projectsService.ensureOwnedProject(createChannelDto.projectId, userId);

    return this.prisma.notificationChannel.create({
      data: {
        ...createChannelDto,
        config: createChannelDto.config as Prisma.InputJsonValue,
      },
      select: this.channelSelect,
    });
  }

  async findAll(userId: string, projectId: string) {
    await this.projectsService.ensureOwnedProject(projectId, userId);

    return this.prisma.notificationChannel.findMany({
      where: { projectId },
      select: this.channelSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const channel = await this.prisma.notificationChannel.findFirst({
      where: {
        id,
        project: {
          userId,
        },
      },
      select: this.channelSelect,
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    return channel;
  }

  async update(id: string, userId: string, updateChannelDto: UpdateChannelDto) {
    await this.findOne(id, userId);

    const data: Prisma.NotificationChannelUpdateInput = {};

    if (updateChannelDto.type) {
      data.type = updateChannelDto.type;
    }

    if (updateChannelDto.name !== undefined) {
      data.name = updateChannelDto.name;
    }

    if (updateChannelDto.active !== undefined) {
      data.active = updateChannelDto.active;
    }

    if (updateChannelDto.config !== undefined) {
      data.config = updateChannelDto.config as Prisma.InputJsonValue;
    }

    return this.prisma.notificationChannel.update({
      where: { id },
      data,
      select: this.channelSelect,
    });
  }

  async delete(id: string, userId: string) {
    await this.findOne(id, userId);

    await this.prisma.notificationChannel.delete({
      where: { id },
    });

    return {
      message: 'Channel deleted successfully',
    };
  }

  private readonly channelSelect = {
    id: true,
    projectId: true,
    type: true,
    name: true,
    config: true,
    active: true,
    createdAt: true,
    updatedAt: true,
  } as const;
}
