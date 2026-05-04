import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HealthService {
  constructor(private readonly configService: ConfigService) {}

  getStatus() {
    return {
      status: 'ok',
      service: this.configService.get<string>('APP_NAME', 'NotificationHub'),
      version: this.configService.get<string>('APP_VERSION', '1.0.0'),
      environment: this.configService.get<string>('NODE_ENV', 'development'),
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      dependencies: {
        databaseConfigured: Boolean(this.configService.get<string>('DATABASE_URL')),
        redisConfigured: Boolean(
          this.configService.get<string>('REDIS_URL') ||
            this.configService.get<string>('REDIS_HOST'),
        ),
      },
    };
  }
}
