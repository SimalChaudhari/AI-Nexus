// src/app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MemoryWatchService } from './common/memory-watch.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly memoryWatchService: MemoryWatchService) {}

  @Get()
  @ApiOperation({ summary: 'Get application health summary' })
  healthCheck() {
    return {
      status: 'ok',
      message: 'AI-Nexus Backend is running successfully',
      timestamp: new Date().toISOString(),
      service: 'AI-Nexus Backend',
      version: '1.0.0',
      memory: this.memoryWatchService.getSnapshot(),
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Get lightweight health check response' })
  health() {
    return {
      status: 'ok',
      message: 'Backend is running successfully',
      timestamp: new Date().toISOString(),
      service: 'AI-Nexus Backend',
      memory: this.memoryWatchService.getSnapshot(),
    };
  }
}
