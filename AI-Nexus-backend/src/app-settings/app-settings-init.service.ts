import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { shouldSkipRuntimeSchemaInit } from '../common/schema-init-guard';

@Injectable()
export class AppSettingsInitService implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    if (shouldSkipRuntimeSchemaInit()) {
      return;
    }
    try {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      const exists = await queryRunner.hasTable('app_settings');

      if (!exists) {
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "app_settings" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "logoUrl" varchar,
            "homeHeroImageUrl" varchar,
            "homeHeroContent" jsonb,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_app_settings" PRIMARY KEY ("id")
          )
        `);
      } else {
        await queryRunner.query(`
          ALTER TABLE "app_settings"
          ADD COLUMN IF NOT EXISTS "homeHeroImageUrl" varchar
        `);
        await queryRunner.query(`
          ALTER TABLE "app_settings"
          ADD COLUMN IF NOT EXISTS "personaCourseMappings" jsonb DEFAULT '[]'::jsonb
        `);
        await queryRunner.query(`
          ALTER TABLE "app_settings"
          ADD COLUMN IF NOT EXISTS "homeHeroContent" jsonb
        `);
        await queryRunner.query(`
          ALTER TABLE "app_settings"
          ADD COLUMN IF NOT EXISTS "courseDefaultImageUrl" varchar
        `);
        await queryRunner.query(`
          ALTER TABLE "app_settings"
          ADD COLUMN IF NOT EXISTS "digitalBadgeImageUrl" varchar
        `);
        await queryRunner.query(`
          ALTER TABLE "app_settings"
          ADD COLUMN IF NOT EXISTS "digitalBadgeIssuer" varchar
        `);
      }

      await queryRunner.query(`
        ALTER TABLE "app_settings"
        ADD COLUMN IF NOT EXISTS "hideAllCertificates" boolean NOT NULL DEFAULT false
      `);
      await queryRunner.query(`
        ALTER TABLE "app_settings"
        ADD COLUMN IF NOT EXISTS "hideAllBadges" boolean NOT NULL DEFAULT false
      `);

      const existingRows = await queryRunner.query(`SELECT "id" FROM "app_settings" LIMIT 1`);

      if (!existingRows?.length) {
        await queryRunner.query(`INSERT INTO "app_settings" ("logoUrl") VALUES (NULL)`);
      }

      await queryRunner.release();
    } catch (error) {
      console.error(
        'Error initializing app_settings table:',
        error instanceof Error ? error.message : error
      );
    }
  }
}
