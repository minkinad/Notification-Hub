import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  const prisma = {
    project: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    apiKey: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  } as any;

  let service: ProjectsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectsService(prisma);
  });

  it('returns project details only for the owner', async () => {
    const project = {
      id: 'project-1',
      name: 'Main Project',
      description: null,
      apiKey: 'pk_123',
      rateLimit: 1000,
      rateLimitWindow: 3600,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prisma.project.findFirst.mockResolvedValue(project);

    await expect(service.findOne('project-1', 'user-1')).resolves.toEqual(
      project,
    );
    expect(prisma.project.findFirst).toHaveBeenCalledWith({
      where: { id: 'project-1', userId: 'user-1' },
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
  });

  it('includes rate limit window in project creation response', async () => {
    prisma.project.create.mockResolvedValue({
      id: 'project-1',
      name: 'Main Project',
      description: null,
      apiKey: 'pk_123',
      rateLimit: 1000,
      rateLimitWindow: 3600,
      active: true,
      createdAt: new Date(),
    });

    await service.create('user-1', {
      name: 'Main Project',
      rateLimit: 1000,
      rateLimitWindow: 3600,
    });

    expect(prisma.project.create).toHaveBeenCalledWith({
      data: {
        name: 'Main Project',
        rateLimit: 1000,
        rateLimitWindow: 3600,
        userId: 'user-1',
        apiKey: expect.stringMatching(/^pk_/),
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
  });

  it('throws when project does not exist during ownership check', async () => {
    prisma.project.findUnique.mockResolvedValue(null);

    await expect(
      service.ensureOwnedProject('missing', 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when project belongs to another user', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'project-1',
      userId: 'user-2',
    });

    await expect(
      service.ensureOwnedProject('project-1', 'user-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('normalizes pagination values for project listing', async () => {
    prisma.project.findMany.mockResolvedValue([]);
    prisma.project.count.mockResolvedValue(0);

    const result = await service.findAll('user-1', -10, 1000);

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 100,
      }),
    );
    expect(result.skip).toBe(0);
    expect(result.take).toBe(100);
  });

  it('creates managed API keys with default ingest scope', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'project-1',
      userId: 'user-1',
      name: 'Main Project',
      description: null,
      rateLimit: 1000,
      rateLimitWindow: 3600,
      active: true,
    });
    prisma.apiKey.create.mockResolvedValue({
      id: 'api-key-1',
      key: 'pk_created',
      name: 'Production',
      scopes: ['events:ingest'],
      active: true,
      lastUsed: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: null,
      rateLimit: null,
      rateLimitWindow: null,
    });

    await service.createApiKey('project-1', 'user-1', {
      name: 'Production',
    });

    expect(prisma.apiKey.create).toHaveBeenCalledWith({
      data: {
        key: expect.stringMatching(/^pk_/),
        userId: 'user-1',
        projectId: 'project-1',
        name: 'Production',
        expiresAt: undefined,
        scopes: ['events:ingest'],
        rateLimit: undefined,
        rateLimitWindow: undefined,
      },
      select: expect.objectContaining({
        key: true,
        id: true,
      }),
    });
  });

  it('verifies active managed API keys and records last use', async () => {
    const project = {
      id: 'project-1',
      userId: 'user-1',
      active: true,
      rateLimit: 1000,
      rateLimitWindow: 3600,
    };
    const apiKey = {
      id: 'api-key-1',
      active: true,
      expiresAt: null,
      project,
    };
    prisma.apiKey.findUnique.mockResolvedValue(apiKey);

    const result = await service.verifyApiKey('pk_managed');

    expect(result).toEqual({
      project,
      apiKey,
    });
    expect(prisma.apiKey.update).toHaveBeenCalledWith({
      where: {
        id: 'api-key-1',
      },
      data: {
        lastUsed: expect.any(Date),
      },
    });
  });
});
