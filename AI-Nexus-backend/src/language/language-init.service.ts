import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class LanguageInitService implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    try {
      console.log('🔍 Checking languages table...');

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      const exists = await queryRunner.hasTable('languages');
      if (!exists) {
        console.log('📋 Creating languages table...');
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "languages" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "title" varchar NOT NULL UNIQUE,
            "deleted" boolean NOT NULL DEFAULT false,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_languages" PRIMARY KEY ("id")
          )
        `);
        console.log('✅ Languages table created successfully');
      } else {
        console.log('✅ Languages table already exists');
        const hasDeleted = await queryRunner.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'languages' AND column_name = 'deleted'
        `);
        if (!hasDeleted?.length) {
          await queryRunner.query(`
            ALTER TABLE "languages" ADD COLUMN "deleted" boolean NOT NULL DEFAULT false
          `);
          console.log('✅ Column deleted added to languages');
        }
      }

      await queryRunner.release();
    } catch (error) {
      console.error(
        '❌ Error initializing languages table:',
        error instanceof Error ? error.message : error,
      );
    }
  }
}
