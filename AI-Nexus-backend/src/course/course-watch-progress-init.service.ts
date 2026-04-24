import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { shouldSkipRuntimeSchemaInit } from '../common/schema-init-guard';

@Injectable()
export class CourseWatchProgressInitService implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    if (shouldSkipRuntimeSchemaInit()) {
      return;
    }
    try {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      const exists = await queryRunner.hasTable('course_watch_progress');
      if (!exists) {
        await queryRunner.query(`
          CREATE TABLE "course_watch_progress" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "userId" uuid NOT NULL,
            "courseId" uuid NOT NULL,
            "watchedSeconds" integer NOT NULL DEFAULT 0,
            "totalDurationSeconds" integer NOT NULL DEFAULT 0,
            "remainingSeconds" integer NOT NULL DEFAULT 0,
            "completionPercent" numeric(5,2) NOT NULL DEFAULT 0,
            "isCompleted" boolean NOT NULL DEFAULT false,
            "lastAccessedAt" TIMESTAMP NOT NULL DEFAULT now(),
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_course_watch_progress" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_course_watch_progress_user_course" UNIQUE ("userId", "courseId"),
            CONSTRAINT "FK_course_watch_progress_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_course_watch_progress_course" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE
          )
        `);
      }

      await queryRunner.release();
    } catch (error) {
      console.error(
        'Error initializing course_watch_progress table:',
        error instanceof Error ? error.message : error,
      );
    }
  }
}

