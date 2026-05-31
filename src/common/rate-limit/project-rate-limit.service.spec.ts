import { HttpException } from '@nestjs/common';
import { ProjectRateLimitService } from './project-rate-limit.service';

describe('ProjectRateLimitService', () => {
  const redis = {
    incr: jest.fn(),
    expire: jest.fn(),
  } as any;

  let service: ProjectRateLimitService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectRateLimitService(redis);
  });

  it('increments the fixed window counter and returns remaining requests', async () => {
    redis.incr.mockResolvedValue(1);

    const result = await service.consume({
      projectId: 'project-1',
      apiKeyId: 'api-key-1',
      limit: 10,
      windowSeconds: 60,
    });

    expect(redis.incr).toHaveBeenCalledWith(
      expect.stringContaining('rate-limit:ingest:api-key-1:'),
    );
    expect(redis.expire).toHaveBeenCalledWith(expect.any(String), 60);
    expect(result.remaining).toBe(9);
  });

  it('rejects requests over the configured limit', async () => {
    redis.incr.mockResolvedValue(11);

    await expect(
      service.consume({
        projectId: 'project-1',
        limit: 10,
        windowSeconds: 60,
      }),
    ).rejects.toBeInstanceOf(HttpException);
  });
});
