import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { shouldSkipRuntimeSchemaInit } from '../common/schema-init-guard';

@Injectable()
export class CourseQuestionBankInitService implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    if (shouldSkipRuntimeSchemaInit()) {
      return;
    }
    try {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      const exists = await queryRunner.hasTable('course_question_bank');
      if (!exists) {
        await queryRunner.query(`
          CREATE TABLE "course_question_bank" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "courseId" uuid NOT NULL,
            "moduleId" uuid,
            "prompt" text NOT NULL,
            "questionType" varchar(32) NOT NULL DEFAULT 'mcq',
            "options" jsonb,
            "correctIndex" int,
            "correctAnswer" text,
            "explanation" text,
            "assignedUserIds" jsonb,
            "sortOrder" int NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_course_question_bank" PRIMARY KEY ("id"),
            CONSTRAINT "FK_course_question_bank_course" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_course_question_bank_module" FOREIGN KEY ("moduleId") REFERENCES "course_modules"("id") ON DELETE SET NULL
          )
        `);
      } else {
        try {
          await queryRunner.query(
            `ALTER TABLE "course_question_bank" ADD COLUMN "moduleId" uuid`,
          );
        } catch (e) {
          if (e instanceof Error && !e.message?.includes('already exists')) throw e;
        }
        try {
          await queryRunner.query(`
            UPDATE "course_question_bank" q
            SET "moduleId" = s."moduleId"
            FROM "course_module_sections" s
            WHERE q."sectionId" IS NOT NULL AND q."sectionId" = s."id" AND q."moduleId" IS NULL
          `);
        } catch {
          // sectionId may already be dropped
        }
        try {
          await queryRunner.query(
            `ALTER TABLE "course_question_bank" DROP CONSTRAINT "FK_course_question_bank_section"`,
          );
        } catch {
          // already dropped
        }
        try {
          await queryRunner.query(
            `ALTER TABLE "course_question_bank" DROP COLUMN "sectionId"`,
          );
        } catch (e) {
          if (e instanceof Error && !e.message?.includes('does not exist')) throw e;
        }
        try {
          await queryRunner.query(`
            ALTER TABLE "course_question_bank"
            ADD CONSTRAINT "FK_course_question_bank_module"
            FOREIGN KEY ("moduleId") REFERENCES "course_modules"("id") ON DELETE SET NULL
          `);
        } catch (e) {
          if (e instanceof Error && !e.message?.includes('already exists')) throw e;
        }
        try {
          await queryRunner.query(
            `ALTER TABLE "course_question_bank" ADD COLUMN "assignedUserIds" jsonb`,
          );
        } catch (e) {
          if (e instanceof Error && !e.message?.includes('already exists')) throw e;
        }
      }

      await queryRunner.release();
    } catch (error) {
      console.error(
        'Error initializing course_question_bank:',
        error instanceof Error ? error.message : error,
      );
    }
  }
}
