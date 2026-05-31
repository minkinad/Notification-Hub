import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
  Version,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Version('1')
  @ApiOperation({ summary: 'Get service health status' })
  @ApiResponse({ status: 200, description: 'Health status retrieved' })
  getStatus() {
    return this.healthService.getStatus();
  }

  @Get('live')
  @Version('1')
  @ApiOperation({ summary: 'Get liveness status' })
  @ApiResponse({ status: 200, description: 'Service process is alive' })
  getLiveStatus() {
    return this.healthService.getLiveStatus();
  }

  @Get('ready')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get readiness status' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({
    status: 503,
    description: 'Service dependencies are not ready',
  })
  async getReadyStatus() {
    const status = await this.healthService.getReadyStatus();

    if (status.status !== 'ok') {
      throw new ServiceUnavailableException(status);
    }

    return status;
  }
}
