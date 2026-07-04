import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { shouldSkipRuntimeSchemaInit } from '../common/schema-init-guard';

@Injectable()
export class AssessmentEvaluationInitService implements OnModuleInit {
  private readonly logger = new Logger(AssessmentEvaluationInitService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    if (shouldSkipRuntimeSchemaInit()) return;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      if (!(await queryRunner.hasTable('assessment_blueprints'))) {
        await queryRunner.query(`
          CREATE TABLE "assessment_blueprints" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "questionBankId" uuid NOT NULL,
            "courseId" uuid NOT NULL,
            "status" varchar(32) NOT NULL DEFAULT 'pending',
            "totalMarks" int NOT NULL DEFAULT 0,
            "passingPercentage" int,
            "processingError" text,
            "sourceContentHash" varchar(64),
            "guidelineRulesId" uuid,
            "processedAt" TIMESTAMP,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_assessment_blueprints" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_assessment_blueprints_question_bank" UNIQUE ("questionBankId")
          )
        `);
      }

      if (!(await queryRunner.hasTable('assessment_guideline_rules'))) {
        await queryRunner.query(`
          CREATE TABLE "assessment_guideline_rules" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "blueprintId" uuid NOT NULL,
            "sourceFileHash" varchar(64) NOT NULL,
            "rules" jsonb NOT NULL,
            "sourceTokenEstimate" int,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_assessment_guideline_rules" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_assessment_guideline_rules_blueprint" UNIQUE ("blueprintId")
          )
        `);
      }

      if (!(await queryRunner.hasTable('assessment_questions'))) {
        await queryRunner.query(`
          CREATE TABLE "assessment_questions" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "blueprintId" uuid NOT NULL,
            "questionNumber" int NOT NULL,
            "label" varchar(16) NOT NULL,
            "promptText" text NOT NULL,
            "expectedAnswerText" text NOT NULL,
            "maxScore" numeric(8,2) NOT NULL DEFAULT 1,
            "sortOrder" int NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_assessment_questions" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_assessment_questions_blueprint_number" UNIQUE ("blueprintId", "questionNumber")
          )
        `);
      }

      if (!(await queryRunner.hasTable('assessment_submission_answers'))) {
        await queryRunner.query(`
          CREATE TABLE "assessment_submission_answers" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "submissionId" uuid NOT NULL,
            "assessmentQuestionId" uuid NOT NULL,
            "answerText" text NOT NULL,
            "source" varchar(16) NOT NULL DEFAULT 'file',
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_assessment_submission_answers" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_assessment_submission_answers" UNIQUE ("submissionId", "assessmentQuestionId")
          )
        `);
      }

      if (!(await queryRunner.hasTable('assessment_question_evaluations'))) {
        await queryRunner.query(`
          CREATE TABLE "assessment_question_evaluations" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "submissionId" uuid NOT NULL,
            "assessmentQuestionId" uuid NOT NULL,
            "status" varchar(24) NOT NULL DEFAULT 'pending',
            "result" jsonb,
            "promptTokens" int,
            "completionTokens" int,
            "errorMessage" text,
            "evaluatedAt" TIMESTAMP,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_assessment_question_evaluations" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_assessment_question_evaluations" UNIQUE ("submissionId", "assessmentQuestionId")
          )
        `);
      }
    } catch (error) {
      this.logger.error(
        `Assessment evaluation schema init failed: ${error instanceof Error ? error.message : error}`,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
