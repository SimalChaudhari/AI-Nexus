import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { shouldSkipRuntimeSchemaInit } from '../common/schema-init-guard';

@Injectable()
export class CategoriesInitService implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    if (shouldSkipRuntimeSchemaInit()) {
      return;
    }
    try {
      console.log('🔍 Checking categories table...');

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      const categoriesExists = await queryRunner.hasTable('categories');
      if (!categoriesExists) {
        console.log('📋 Creating categories table...');
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "categories" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "title" varchar NOT NULL,
            "description" text,
            "image" text,
            "slug" varchar NOT NULL,
            "icon" varchar,
            "status" varchar NOT NULL DEFAULT 'active',
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_categories" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_categories_slug" UNIQUE ("slug")
          )
        `);
        console.log('✅ Categories table created successfully');
      } else {
        console.log('✅ Categories table already exists');
        await queryRunner.query(`ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "description" text`);
        await queryRunner.query(`ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "image" text`);
        await queryRunner.query(`ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "slug" varchar`);

        await queryRunner.query(`
          UPDATE "categories"
          SET "slug" = 'c-' || REPLACE("id"::text, '-', '')
          WHERE "slug" IS NULL OR trim(COALESCE("slug", '')) = ''
        `);

        await queryRunner.query(`
          ALTER TABLE "categories" ALTER COLUMN "slug" SET NOT NULL
        `);

        await queryRunner.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS "UQ_categories_slug" ON "categories" ("slug")
        `);
      }

      // Remove legacy communities table if present (no longer used in this codebase).
      await queryRunner.query(`DROP TABLE IF EXISTS "communities" CASCADE`);

      await queryRunner.release();
    } catch (error) {
      console.error('❌ Error initializing categories table:', error instanceof Error ? error.message : error);
    }
  }
}
