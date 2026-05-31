import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { PrismaService } from '@common/prisma/prisma.service';
import { REDIS_CLIENT } from '@common/redis/redis.module';

@Injectable()
export class HealthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  getLiveStatus() {
    return this.getBaseStatus('ok');
  }

  async getStatus() {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);
    const isHealthy = database.status === 'up' && redis.status === 'up';

    return {
      ...this.getBaseStatus(isHealthy ? 'ok' : 'degraded'),
      dependencies: {
        database,
        redis,
      },
    };
  }

  async getReadyStatus() {
    return this.getStatus();
  }

  private getBaseStatus(status: 'ok' | 'degraded') {
    return {
      status,
      service: this.configService.get<string>('APP_NAME', 'NotificationHub'),
      version: this.configService.get<string>('APP_VERSION', '1.0.0'),
      environment: this.configService.get<string>('NODE_ENV', 'development'),
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    };
  }

  private async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'up' as const,
      };
    } catch (error) {
      return {
        status: 'down' as const,
        message: this.getErrorMessage(error),
      };
    }
  }

  private async checkRedis() {
    try {
      await this.redis.ping();

      return {
        status: 'up' as const,
      };
    } catch (error) {
      return {
        status: 'down' as const,
        message: this.getErrorMessage(error),
      };
    }
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown dependency error';
  }
}
