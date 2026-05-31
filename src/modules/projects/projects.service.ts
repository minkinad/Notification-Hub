import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma, Project } from '@prisma/client';
import { AuditService } from '@common/audit/audit.service';
import { isPrismaUniqueConstraintError } from '@common/prisma/prisma-errors';
import { PrismaService } from '@common/prisma/prisma.service';
import { normalizePagination } from '@common/utils/pagination';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  async create(userId: string, createProjectDto: CreateProjectDto) {
    const project = await this.prisma.project.create({
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
        rateLimitWindow: true,
        active: true,
        createdAt: true,
      },
    });

    await this.auditService?.log({
      userId,
      projectId: project.id,
      action: 'project.create',
      resource: 'project',
      details: {
        projectId: project.id,
        name: project.name,
      },
    });

    return project;
  }

  async findAll(userId: string, skip = 0, take = 10) {
    const pagination = normalizePagination({ skip, take });
    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where: { userId },
        skip: pagination.skip,
        take: pagination.take,
        select: {
          id: true,
          name: true,
          description: true,
          apiKey: true,
          rateLimit: true,
          rateLimitWindow: true,
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
      skip: pagination.skip,
      take: pagination.take,
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
        rateLimitWindow: true,
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
    const existingProject = await this.ensureOwnedProject(id, userId);

    const updatedProject = await this.prisma.project.update({
      where: { id },
      data: updateProjectDto,
      select: {
        id: true,
        name: true,
        description: true,
        apiKey: true,
        rateLimit: true,
        rateLimitWindow: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.auditService?.log({
      userId,
      projectId: id,
      action: 'project.update',
      resource: 'project',
      changes: {
        before: this.pickProjectAuditFields(existingProject),
        after: this.pickProjectAuditFields(updatedProject),
      },
    });

    return updatedProject;
  }

  async delete(id: string, userId: string) {
    const project = await this.ensureOwnedProject(id, userId);

    await this.auditService?.log({
      userId,
      projectId: id,
      action: 'project.delete',
      resource: 'project',
      details: {
        projectId: id,
        name: project.name,
      },
    });

    await this.prisma.project.delete({
      where: { id },
    });

    return { message: 'Project deleted successfully' };
  }

  async regenerateApiKey(id: string, userId: string) {
    await this.ensureOwnedProject(id, userId);

    const project = await this.prisma.project.update({
      where: { id },
      data: {
        apiKey: `pk_${randomUUID()}`,
      },
      select: {
        id: true,
        apiKey: true,
      },
    });

    await this.auditService?.log({
      userId,
      projectId: id,
      action: 'project.regenerate_legacy_api_key',
      resource: 'project',
      details: {
        projectId: id,
      },
    });

    return project;
  }

  async createApiKey(
    projectId: string,
    userId: string,
    createApiKeyDto: CreateApiKeyDto,
  ) {
    const project = await this.ensureOwnedProject(projectId, userId);
    const expiresAt = createApiKeyDto.expiresAt
      ? new Date(createApiKeyDto.expiresAt)
      : undefined;

    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('API key expiration must be in the future');
    }

    try {
      const apiKey = await this.prisma.apiKey.create({
        data: {
          key: `pk_${randomUUID()}`,
          userId,
          projectId,
          name: createApiKeyDto.name,
          expiresAt,
          scopes: (createApiKeyDto.scopes ?? [
            'events:ingest',
          ]) as Prisma.InputJsonValue,
          rateLimit: createApiKeyDto.rateLimit,
          rateLimitWindow: createApiKeyDto.rateLimitWindow,
        },
        select: this.apiKeyCreatedSelect,
      });

      await this.auditService?.log({
        userId,
        projectId,
        action: 'api_key.create',
        resource: 'api_key',
        details: {
          apiKeyId: apiKey.id,
          projectId: project.id,
          name: apiKey.name,
        },
      });

      return apiKey;
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException(
          `API key named ${createApiKeyDto.name} already exists for this project`,
        );
      }
      throw error;
    }
  }

  async listApiKeys(projectId: string, userId: string) {
    await this.ensureOwnedProject(projectId, userId);

    return this.prisma.apiKey.findMany({
      where: {
        projectId,
      },
      select: this.apiKeyListSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateApiKey(
    projectId: string,
    apiKeyId: string,
    userId: string,
    updateApiKeyDto: UpdateApiKeyDto,
  ) {
    await this.ensureOwnedProject(projectId, userId);
    const existingApiKey = await this.findApiKeyForProject(projectId, apiKeyId);
    const expiresAt = updateApiKeyDto.expiresAt
      ? new Date(updateApiKeyDto.expiresAt)
      : undefined;

    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('API key expiration must be in the future');
    }

    try {
      const updatedApiKey = await this.prisma.apiKey.update({
        where: {
          id: apiKeyId,
        },
        data: {
          ...(updateApiKeyDto.name !== undefined
            ? { name: updateApiKeyDto.name }
            : {}),
          ...(updateApiKeyDto.scopes !== undefined
            ? { scopes: updateApiKeyDto.scopes as Prisma.InputJsonValue }
            : {}),
          ...(updateApiKeyDto.rateLimit !== undefined
            ? { rateLimit: updateApiKeyDto.rateLimit }
            : {}),
          ...(updateApiKeyDto.rateLimitWindow !== undefined
            ? { rateLimitWindow: updateApiKeyDto.rateLimitWindow }
            : {}),
          ...(updateApiKeyDto.active !== undefined
            ? { active: updateApiKeyDto.active }
            : {}),
          ...(expiresAt !== undefined ? { expiresAt } : {}),
        },
        select: this.apiKeyListSelect,
      });

      await this.auditService?.log({
        userId,
        projectId,
        action: 'api_key.update',
        resource: 'api_key',
        changes: {
          before: existingApiKey,
          after: updatedApiKey,
        },
      });

      return updatedApiKey;
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException(
          `API key named ${updateApiKeyDto.name} already exists for this project`,
        );
      }
      throw error;
    }
  }

  async revokeApiKey(projectId: string, apiKeyId: string, userId: string) {
    await this.ensureOwnedProject(projectId, userId);
    const apiKey = await this.findApiKeyForProject(projectId, apiKeyId);

    const revokedApiKey = await this.prisma.apiKey.update({
      where: {
        id: apiKeyId,
      },
      data: {
        active: false,
      },
      select: this.apiKeyListSelect,
    });

    await this.auditService?.log({
      userId,
      projectId,
      action: 'api_key.revoke',
      resource: 'api_key',
      details: {
        apiKeyId,
        name: apiKey.name,
        wasActive: apiKey.active,
      },
    });

    return revokedApiKey;
  }

  async verifyApiKey(apiKey: string) {
    const managedApiKey = await this.prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: {
        project: true,
      },
    });

    if (managedApiKey) {
      const expired =
        managedApiKey.expiresAt !== null &&
        managedApiKey.expiresAt.getTime() <= Date.now();

      if (!managedApiKey.active || expired || !managedApiKey.project.active) {
        return null;
      }

      await this.prisma.apiKey.update({
        where: {
          id: managedApiKey.id,
        },
        data: {
          lastUsed: new Date(),
        },
      });

      return {
        project: managedApiKey.project,
        apiKey: managedApiKey,
      };
    }

    const project = await this.prisma.project.findUnique({
      where: { apiKey },
    });

    if (!project || !project.active) {
      return null;
    }

    return {
      project,
      apiKey: null,
    };
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

  private readonly apiKeyListSelect = {
    id: true,
    name: true,
    scopes: true,
    active: true,
    lastUsed: true,
    createdAt: true,
    updatedAt: true,
    expiresAt: true,
    rateLimit: true,
    rateLimitWindow: true,
  } as const;

  private readonly apiKeyCreatedSelect = {
    ...this.apiKeyListSelect,
    key: true,
  } as const;

  private async findApiKeyForProject(projectId: string, apiKeyId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: {
        id: apiKeyId,
        projectId,
      },
      select: this.apiKeyListSelect,
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return apiKey;
  }

  private pickProjectAuditFields(
    project: Pick<
      Project,
      'name' | 'description' | 'rateLimit' | 'rateLimitWindow' | 'active'
    >,
  ) {
    return {
      name: project.name,
      description: project.description,
      rateLimit: project.rateLimit,
      rateLimitWindow: project.rateLimitWindow,
      active: project.active,
    };
  }
}
