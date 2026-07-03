import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { DATABASE_PERFORMANCE_INDEXES } from './database-performance-indexes';

/**
 * Applies performance indexes on every boot (idempotent).
 * Runs even when DATABASE_SKIP_RUNTIME_SCHEMA_INIT=true so existing DBs get indexes.
 * Set DATABASE_SKIP_INDEX_INIT=true to disable.
 */
@Injectable()
export class DatabaseIndexInitService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseIndexInitService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    if (process.env.DATABASE_SKIP_INDEX_INIT === 'true') {
      this.logger.log('Skipping performance index init (DATABASE_SKIP_INDEX_INIT=true)');
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    const applied: string[] = [];
    const skipped: string[] = [];
    const failed: string[] = [];

    try {
      await queryRunner.connect();

      for (const index of DATABASE_PERFORMANCE_INDEXES) {
        try {
          const tableExists = await queryRunner.hasTable(index.table);
          if (!tableExists) {
            skipped.push(index.name);
            continue;
          }
          await queryRunner.query(index.sql);
          applied.push(index.name);
        } catch (error) {
          failed.push(index.name);
          this.logger.warn(
            `Index ${index.name} failed: ${error instanceof Error ? error.message : error}`,
          );
        }
      }

      this.logger.log(
        `Performance indexes: ${applied.length} applied, ${skipped.length} skipped (missing table), ${failed.length} failed`,
      );
    } catch (error) {
      this.logger.error(
        'Performance index init failed',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      await queryRunner.release();
    }
  }
}
