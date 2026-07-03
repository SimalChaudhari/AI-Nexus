import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { shouldSkipRuntimeSchemaInit } from '../common/schema-init-guard';

@Injectable()
export class CourseQuestionBankAttemptInitService implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    if (shouldSkipRuntimeSchemaInit()) {
      return;
    }
    try {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      const exists = await queryRunner.hasTable('course_question_bank_attempt');
      if (!exists) {
        await queryRunner.query(`
          CREATE TABLE "course_question_bank_attempt" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "userId" uuid NOT NULL,
            "courseId" uuid NOT NULL,
            "moduleId" uuid,
            "attemptNumber" int NOT NULL DEFAULT 1,
            "status" varchar(24) NOT NULL DEFAULT 'started',
            "startedAt" TIMESTAMP,
            "completedAt" TIMESTAMP,
            "totalQuestions" int NOT NULL DEFAULT 0,
            "answeredQuestions" int NOT NULL DEFAULT 0,
            "correctAnswers" int NOT NULL DEFAULT 0,
            "scorePercent" float NOT NULL DEFAULT 0,
            "answers" jsonb,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_course_question_bank_attempt" PRIMARY KEY ("id"),
            CONSTRAINT "FK_course_question_bank_attempt_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_course_question_bank_attempt_course" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_course_question_bank_attempt_module" FOREIGN KEY ("moduleId") REFERENCES "course_modules"("id") ON DELETE SET NULL
          )
        `);
      }

      try {
        await queryRunner.query(
          `ALTER TABLE "course_question_bank_attempt" ADD COLUMN "isCompleted" boolean NOT NULL DEFAULT false`,
        );
      } catch (e) {
        if (e instanceof Error && !e.message?.includes('already exists')) throw e;
      }

      await queryRunner.release();
    } catch (error) {
      console.error(
        'Error initializing course_question_bank_attempt:',
        error instanceof Error ? error.message : error,
      );
    }
  }
}

