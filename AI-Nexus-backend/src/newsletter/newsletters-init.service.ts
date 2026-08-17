import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { shouldSkipRuntimeSchemaInit } from '../common/schema-init-guard';

@Injectable()
export class NewslettersInitService implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    if (shouldSkipRuntimeSchemaInit()) {
      return;
    }
    try {
      console.log('🔍 Checking newsletters table...');

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      const newslettersExists = await queryRunner.hasTable('newsletters');
      if (!newslettersExists) {
        console.log('📋 Creating newsletters table...');
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "newsletters" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "title" varchar(255) NOT NULL,
            "summary" text DEFAULT NULL,
            "format" varchar(8) NOT NULL DEFAULT 'html',
            "fileUrl" varchar(2048) NOT NULL,
            "originalFileName" varchar(255) DEFAULT NULL,
            "publishAt" TIMESTAMP DEFAULT NULL,
            "isActive" boolean NOT NULL DEFAULT true,
            "sortOrder" int NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_newsletters" PRIMARY KEY ("id")
          )
        `);
        console.log('✅ Newsletters table created successfully');
      } else {
        console.log('✅ Newsletters table already exists');
      }

      await queryRunner.release();
    } catch (error) {
      console.error(
        '❌ Error initializing newsletters table:',
        error instanceof Error ? error.message : error,
      );
    }
  }
}
