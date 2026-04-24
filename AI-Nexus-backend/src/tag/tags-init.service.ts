import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { shouldSkipRuntimeSchemaInit } from '../common/schema-init-guard';

@Injectable()
export class TagsInitService implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    if (shouldSkipRuntimeSchemaInit()) {
      return;
    }
    try {
      console.log('🔍 Checking tags table...');
      
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      const tagsExists = await queryRunner.hasTable('tags');
      if (!tagsExists) {
        console.log('📋 Creating tags table...');
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "tags" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "title" varchar NOT NULL UNIQUE,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_tags" PRIMARY KEY ("id")
          )
        `);
        console.log('✅ Tags table created successfully');
      } else {
        console.log('✅ Tags table already exists');
      }

      await queryRunner.release();
    } catch (error) {
      console.error('❌ Error initializing tags table:', error instanceof Error ? error.message : error);
    }
  }
}
