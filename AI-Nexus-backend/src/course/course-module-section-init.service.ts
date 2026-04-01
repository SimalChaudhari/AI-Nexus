import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class CourseModuleSectionInitService implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    try {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      const exists = await queryRunner.hasTable('course_module_sections');
      if (!exists) {
        await queryRunner.query(`
          CREATE TABLE "course_module_sections" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "moduleId" uuid NOT NULL,
            "sortOrder" int NOT NULL DEFAULT 0,
            "title" varchar(255) NOT NULL,
            "videoUrl" varchar(500),
            "description" text,
            "content" text,
            "watchtime" varchar(50),
            "images" jsonb,
            "attachments" jsonb,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_course_module_sections" PRIMARY KEY ("id"),
            CONSTRAINT "FK_course_module_sections_module" FOREIGN KEY ("moduleId") REFERENCES "course_modules"("id") ON DELETE CASCADE
          )
        `);
      } else {
        try {
          await queryRunner.query(`ALTER TABLE "course_module_sections" ADD COLUMN "content" text`);
        } catch (alterErr) {
          if (alterErr instanceof Error && !alterErr.message?.includes('already exists')) {
            throw alterErr;
          }
        }
        try {
          await queryRunner.query(`ALTER TABLE "course_module_sections" ADD COLUMN "watchtime" varchar(50)`);
        } catch (watchErr) {
          if (watchErr instanceof Error && !watchErr.message?.includes('already exists')) {
            throw watchErr;
          }
        }
        try {
          await queryRunner.query(`ALTER TABLE "course_module_sections" ADD COLUMN "images" jsonb`);
        } catch (imgErr) {
          if (imgErr instanceof Error && !imgErr.message?.includes('already exists')) {
            throw imgErr;
          }
        }
        try {
          await queryRunner.query(`ALTER TABLE "course_module_sections" ADD COLUMN "attachments" jsonb`);
        } catch (filesErr) {
          if (filesErr instanceof Error && !filesErr.message?.includes('already exists')) {
            throw filesErr;
          }
        }
      }

      await queryRunner.release();
    } catch (error) {
      console.error(
        'Error initializing course_module_sections:',
        error instanceof Error ? error.message : error,
      );
    }
  }
}
