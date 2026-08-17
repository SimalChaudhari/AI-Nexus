import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { shouldSkipRuntimeSchemaInit } from '../common/schema-init-guard';

@Injectable()
export class SkillsInitService implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    if (shouldSkipRuntimeSchemaInit()) {
      return;
    }
    try {
      console.log('🔍 Checking skills table...');

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      const skillsExists = await queryRunner.hasTable('skills');
      if (!skillsExists) {
        console.log('📋 Creating skills table...');
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "skills" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "name" varchar(64) NOT NULL UNIQUE,
            "title" varchar(255) NOT NULL,
            "description" text NOT NULL,
            "license" varchar(255) DEFAULT NULL,
            "sourceUrl" varchar(2048) DEFAULT NULL,
            "content" text NOT NULL,
            "extraFields" jsonb NOT NULL DEFAULT '[]'::jsonb,
            "sortOrder" int NOT NULL DEFAULT 0,
            "isActive" boolean NOT NULL DEFAULT true,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_skills" PRIMARY KEY ("id")
          )
        `);
        console.log('✅ Skills table created successfully');
      } else {
        console.log('✅ Skills table already exists');
      }

      await queryRunner.release();
    } catch (error) {
      console.error('❌ Error initializing skills table:', error instanceof Error ? error.message : error);
    }
  }
}
