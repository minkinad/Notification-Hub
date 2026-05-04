import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '@common/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createProjectDto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        ...createProjectDto,
        userId,
        apiKey: `pk_${randomUUID()}`,
      },
      select: {
        id: true,
        name: true,
        description: true,
        apiKey: true,
        rateLimit: true,
        active: true,
        createdAt: true,
      },
    });

  }

  async findAll(userId: string, skip = 0, take = 10) {
    const normalizedTake = Math.min(Math.max(take, 1), 100);
    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where: { userId },
        skip,
        take: normalizedTake,
        select: {
          id: true,
          name: true,
          description: true,
          apiKey: true,
          active: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.project.count({ where: { userId } }),
    ]);

    return {
      data: projects,
      total,
      skip,
      take: normalizedTake,
    };
  }

  async findOne(id: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
      select: {
        id: true,
        name: true,
        description: true,
        apiKey: true,
        rateLimit: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async update(id: string, userId: string, updateProjectDto: UpdateProjectDto) {
    await this.ensureOwnedProject(id, userId);

    return this.prisma.project.update({
      where: { id },
      data: updateProjectDto,
      select: {
        id: true,
        name: true,
        description: true,
        apiKey: true,
        rateLimit: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async delete(id: string, userId: string) {
    await this.ensureOwnedProject(id, userId);

    await this.prisma.project.delete({
      where: { id },
    });

    return { message: 'Project deleted successfully' };
  }

  async regenerateApiKey(id: string, userId: string) {
    await this.ensureOwnedProject(id, userId);

    return this.prisma.project.update({
      where: { id },
      data: {
        apiKey: `pk_${randomUUID()}`,
      },
      select: {
        id: true,
        apiKey: true,
      },
    });
  }

  async verifyApiKey(apiKey: string) {
    const project = await this.prisma.project.findUnique({
      where: { apiKey },
    });

    if (!project || !project.active) {
      return null;
    }

    return project;
  }

  async ensureOwnedProject(id: string, userId: string): Promise<Project> {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return project;
  }
}
