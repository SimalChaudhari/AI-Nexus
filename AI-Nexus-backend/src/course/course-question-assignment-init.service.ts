import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { shouldSkipRuntimeSchemaInit } from '../common/schema-init-guard';

@Injectable()
export class CourseQuestionAssignmentInitService implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    if (shouldSkipRuntimeSchemaInit()) {
      return;
    }
    try {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      try {
        await queryRunner.query(
          `ALTER TABLE "course_question_bank" ADD COLUMN "assignedUserIds" jsonb`,
        );
      } catch (e) {
        if (e instanceof Error && !e.message?.includes('already exists')) throw e;
      }

      const exists = await queryRunner.hasTable('course_question_assignment_submissions');
      if (!exists) {
        await queryRunner.query(`
          CREATE TABLE "course_question_assignment_submissions" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "questionId" uuid NOT NULL,
            "courseId" uuid NOT NULL,
            "userId" uuid NOT NULL,
            "fileUrl" text NOT NULL,
            "originalFileName" text NOT NULL,
            "uploadedAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_course_question_assignment_submissions" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_course_question_assignment_submissions_user_question" UNIQUE ("questionId", "userId"),
            CONSTRAINT "FK_course_question_assignment_submissions_question" FOREIGN KEY ("questionId") REFERENCES "course_question_bank"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_course_question_assignment_submissions_course" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_course_question_assignment_submissions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
          )
        `);
      }

      await queryRunner.release();
    } catch (error) {
      console.error(
        'Error initializing course_question_assignment_submissions:',
        error instanceof Error ? error.message : error,
      );
    }
  }
}
