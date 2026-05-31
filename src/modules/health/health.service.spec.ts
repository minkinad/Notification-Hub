import { HealthService } from './health.service';

describe('HealthService', () => {
  const configService = {
    get: jest.fn((key: string, fallback?: string) => {
      const values: Record<string, string> = {
        APP_NAME: 'NotificationHub',
        APP_VERSION: '1.0.0',
        NODE_ENV: 'test',
      };

      return values[key] ?? fallback;
    }),
  } as any;

  const prisma = {
    $queryRaw: jest.fn(),
  } as any;

  const redis = {
    ping: jest.fn(),
  } as any;

  let service: HealthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HealthService(configService, prisma, redis);
  });

  it('reports ok when dependencies respond', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    redis.ping.mockResolvedValue('PONG');

    const result = await service.getStatus();

    expect(result.status).toBe('ok');
    expect(result.dependencies.database.status).toBe('up');
    expect(result.dependencies.redis.status).toBe('up');
  });

  it('reports live status without checking dependencies', () => {
    const result = service.getLiveStatus();

    expect(result.status).toBe('ok');
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(redis.ping).not.toHaveBeenCalled();
  });

  it('reports degraded when a dependency fails', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('database unavailable'));
    redis.ping.mockResolvedValue('PONG');

    const result = await service.getStatus();

    expect(result.status).toBe('degraded');
    expect(result.dependencies.database).toEqual({
      status: 'down',
      message: 'database unavailable',
    });
    expect(result.dependencies.redis.status).toBe('up');
  });
});
