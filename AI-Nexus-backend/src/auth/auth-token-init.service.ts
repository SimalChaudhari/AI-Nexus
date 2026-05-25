import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { shouldSkipRuntimeSchemaInit } from '../common/schema-init-guard';

@Injectable()
export class AuthTokenInitService implements OnModuleInit {
  private readonly logger = new Logger(AuthTokenInitService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    if (shouldSkipRuntimeSchemaInit()) {
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      const exists = await queryRunner.hasTable('refresh_tokens');
      if (!exists) {
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "refresh_tokens" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "userId" uuid NOT NULL,
            "tokenHash" varchar(64) NOT NULL,
            "expiresAt" TIMESTAMP NOT NULL,
            "revokedAt" TIMESTAMP,
            "userAgent" varchar(512),
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id")
          )
        `);
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_userId"
          ON "refresh_tokens" ("userId")
        `);
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_tokenHash"
          ON "refresh_tokens" ("tokenHash")
        `);
        this.logger.log('refresh_tokens table created successfully');
      }
    } catch (error) {
      this.logger.error(
        'Failed to initialize refresh_tokens table',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
