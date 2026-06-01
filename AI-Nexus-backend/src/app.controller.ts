// src/app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Get application health summary' })
  healthCheck() {
    return {
      status: 'ok',
      message: 'AI-Nexus Backend is running successfully',
      timestamp: new Date().toISOString(),
      service: 'AI-Nexus Backend',
      version: '1.0.0',
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
    };
  }

  @Get('health/upload-limits')
  @ApiOperation({ summary: 'Report configured upload size limits (for 413 diagnostics)' })
  uploadLimits() {
    const parseGb = (value: string | undefined, fallback: number) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    };
    const sectionVideoMaxGb = parseGb(process.env.UPLOAD_SECTION_VIDEO_MAX_GB, 20);
    return {
      sectionVideoMaxGb,
      sectionVideoMaxBytes: sectionVideoMaxGb * 1024 * 1024 * 1024,
      jsonBodyLimit: process.env.JSON_BODY_LIMIT?.trim() || '50mb',
      nestBodyParserDisabled: true,
      hint:
        'If POST upload-video still returns 413, raise nginx/IIS client_max_body_size (see deploy/nginx-server-port-5000.conf).',
    };
  }
}

