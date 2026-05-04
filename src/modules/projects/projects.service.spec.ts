import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  const prisma = {
    project: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
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
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prisma.project.findFirst.mockResolvedValue(project);

    await expect(service.findOne('project-1', 'user-1')).resolves.toEqual(project);
    expect(prisma.project.findFirst).toHaveBeenCalledWith({
      where: { id: 'project-1', userId: 'user-1' },
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
  });

  it('throws when project does not exist during ownership check', async () => {
    prisma.project.findUnique.mockResolvedValue(null);

    await expect(service.ensureOwnedProject('missing', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws when project belongs to another user', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'project-1',
      userId: 'user-2',
    });

    await expect(service.ensureOwnedProject('project-1', 'user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
