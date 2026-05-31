import { Module } from '@nestjs/common';
import { RedisModule } from '@common/redis/redis.module';
import { ProjectRateLimitService } from './project-rate-limit.service';

@Module({
  imports: [RedisModule],
  providers: [ProjectRateLimitService],
  exports: [ProjectRateLimitService],
})
export class RateLimitModule {}
