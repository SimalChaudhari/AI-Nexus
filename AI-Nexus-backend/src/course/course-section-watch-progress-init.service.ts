import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { shouldSkipRuntimeSchemaInit } from '../common/schema-init-guard';

@Injectable()
export class CourseSectionWatchProgressInitService implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    if (shouldSkipRuntimeSchemaInit()) {
      return;
    }
    try {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      const exists = await queryRunner.hasTable('course_section_watch_progress');
      if (!exists) {
        await queryRunner.query(`
          CREATE TABLE "course_section_watch_progress" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "userId" uuid NOT NULL,
            "courseId" uuid NOT NULL,
            "sectionId" uuid NOT NULL,
            "lastPositionSeconds" integer NOT NULL DEFAULT 0,
            "watchedSeconds" integer NOT NULL DEFAULT 0,
            "watchedCoverageRanges" json,
            "durationSeconds" integer NOT NULL DEFAULT 0,
            "remainingSeconds" integer NOT NULL DEFAULT 0,
            "completionPercent" numeric(5,2) NOT NULL DEFAULT 0,
            "isCompleted" boolean NOT NULL DEFAULT false,
            "lastAccessedAt" TIMESTAMP NOT NULL DEFAULT now(),
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_course_section_watch_progress" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_course_section_watch_progress_user_course_section" UNIQUE ("userId", "courseId", "sectionId"),
            CONSTRAINT "FK_course_section_watch_progress_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_course_section_watch_progress_course" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_course_section_watch_progress_section" FOREIGN KEY ("sectionId") REFERENCES "course_module_sections"("id") ON DELETE CASCADE
          )
        `);
      } else {
        const col = await queryRunner.query(`
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'course_section_watch_progress'
            AND column_name = 'watchedCoverageRanges'
          LIMIT 1
        `);
        if (!Array.isArray(col) || col.length === 0) {
          await queryRunner.query(`
            ALTER TABLE "course_section_watch_progress"
            ADD COLUMN "watchedCoverageRanges" json
          `);
        }
        try {
          await queryRunner.query(`
            ALTER TABLE "course_section_watch_progress"
            ADD COLUMN "sourceVideoUrl" varchar(500)
          `);
        } catch (e) {
          if (e instanceof Error && !e.message?.includes('already exists')) throw e;
        }
      }

      await queryRunner.release();
    } catch (error) {
      console.error(
        'Error initializing course_section_watch_progress table:',
        error instanceof Error ? error.message : error,
      );
    }
  }
}

