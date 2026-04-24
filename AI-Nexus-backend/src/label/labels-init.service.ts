import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { shouldSkipRuntimeSchemaInit } from '../common/schema-init-guard';

@Injectable()
export class LabelsInitService implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    if (shouldSkipRuntimeSchemaInit()) {
      return;
    }
    try {
      console.log('🔍 Checking labels table...');
      
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      const labelsExists = await queryRunner.hasTable('labels');
      if (!labelsExists) {
        console.log('📋 Creating labels table...');
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "labels" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "title" varchar NOT NULL UNIQUE,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_labels" PRIMARY KEY ("id")
          )
        `);
        console.log('✅ Labels table created successfully');
      } else {
        console.log('✅ Labels table already exists');
      }

      await queryRunner.release();
    } catch (error) {
      console.error('❌ Error initializing labels table:', error instanceof Error ? error.message : error);
    }
  }
}
