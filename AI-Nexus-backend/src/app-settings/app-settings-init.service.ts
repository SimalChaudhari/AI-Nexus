import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AppSettingsInitService implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
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
      }

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
