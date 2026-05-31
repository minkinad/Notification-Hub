import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@common/redis/redis.module';

interface ConsumeRateLimitInput {
  projectId: string;
  apiKeyId?: string;
  limit: number;
  windowSeconds: number;
}

@Injectable()
export class ProjectRateLimitService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async consume(input: ConsumeRateLimitInput) {
    const windowSeconds = Math.max(1, input.windowSeconds);
    const limit = Math.max(1, input.limit);
    const now = Date.now();
    const windowStartedAt = Math.floor(now / (windowSeconds * 1000));
    const keyOwner = input.apiKeyId ?? input.projectId;
    const key = `rate-limit:ingest:${keyOwner}:${windowStartedAt}`;

    let count: number;
    try {
      count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, windowSeconds);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ServiceUnavailableException(
        `Rate limit store is unavailable: ${message}`,
      );
    }

    const resetAt = new Date((windowStartedAt + 1) * windowSeconds * 1000);

    if (count > limit) {
      throw new HttpException(
        {
          message: 'Project ingest rate limit exceeded',
          limit,
          remaining: 0,
          resetAt: resetAt.toISOString(),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return {
      limit,
      remaining: Math.max(0, limit - count),
      resetAt,
    };
  }
}
