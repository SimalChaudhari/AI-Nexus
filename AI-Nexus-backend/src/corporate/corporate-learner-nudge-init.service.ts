import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { shouldSkipRuntimeSchemaInit } from '../common/schema-init-guard';

@Injectable()
export class CorporateLearnerNudgeInitService implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    if (shouldSkipRuntimeSchemaInit()) {
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      const exists = await queryRunner.hasTable('corporate_learner_nudges');
      if (!exists) {
        await queryRunner.query(`
          CREATE TABLE "corporate_learner_nudges" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "companyCode" character varying(120) NOT NULL,
            "userId" uuid NOT NULL,
            "lastNudgedAt" TIMESTAMP NOT NULL,
            "nudgeCount" integer NOT NULL DEFAULT 1,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_corporate_learner_nudges" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_corporate_learner_nudges_company_user" UNIQUE ("companyCode", "userId"),
            CONSTRAINT "FK_corporate_learner_nudges_user"
              FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
          )
        `);
        await queryRunner.query(
          `CREATE INDEX "IDX_corporate_learner_nudges_company" ON "corporate_learner_nudges" ("companyCode")`,
        );
        await queryRunner.query(
          `CREATE INDEX "IDX_corporate_learner_nudges_user" ON "corporate_learner_nudges" ("userId")`,
        );
        console.log('✅ corporate_learner_nudges table created successfully');
      }

      const campaignsExist = await queryRunner.hasTable('corporate_nudge_campaigns');
      if (!campaignsExist) {
        await queryRunner.query(`
          CREATE TABLE "corporate_nudge_campaigns" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "companyCode" character varying(120) NOT NULL,
            "createdByUserId" uuid,
            "status" character varying(32) NOT NULL DEFAULT 'completed',
            "targetCount" integer NOT NULL DEFAULT 0,
            "sentCount" integer NOT NULL DEFAULT 0,
            "failedCount" integer NOT NULL DEFAULT 0,
            "skippedCount" integer NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_corporate_nudge_campaigns" PRIMARY KEY ("id")
          )
        `);
        await queryRunner.query(
          `CREATE INDEX "IDX_corporate_nudge_campaigns_company" ON "corporate_nudge_campaigns" ("companyCode")`,
        );
        await queryRunner.query(
          `CREATE INDEX "IDX_corporate_nudge_campaigns_created" ON "corporate_nudge_campaigns" ("createdAt")`,
        );
        console.log('✅ corporate_nudge_campaigns table created successfully');
      }

      const logsExist = await queryRunner.hasTable('corporate_nudge_email_logs');
      if (!logsExist) {
        await queryRunner.query(`
          CREATE TABLE "corporate_nudge_email_logs" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "companyCode" character varying(120) NOT NULL,
            "campaignId" uuid,
            "userId" uuid NOT NULL,
            "toEmail" character varying(320) NOT NULL,
            "learnerName" character varying(160),
            "subject" character varying(255) NOT NULL,
            "progressLabel" character varying(255),
            "status" character varying(32) NOT NULL,
            "errorMessage" text,
            "sentByUserId" uuid,
            "source" character varying(32) NOT NULL DEFAULT 'single',
            "sentAt" TIMESTAMP NOT NULL,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_corporate_nudge_email_logs" PRIMARY KEY ("id"),
            CONSTRAINT "FK_corporate_nudge_email_logs_user"
              FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
          )
        `);
        await queryRunner.query(
          `CREATE INDEX "IDX_corporate_nudge_email_logs_company" ON "corporate_nudge_email_logs" ("companyCode")`,
        );
        await queryRunner.query(
          `CREATE INDEX "IDX_corporate_nudge_email_logs_user" ON "corporate_nudge_email_logs" ("userId")`,
        );
        await queryRunner.query(
          `CREATE INDEX "IDX_corporate_nudge_email_logs_campaign" ON "corporate_nudge_email_logs" ("campaignId")`,
        );
        await queryRunner.query(
          `CREATE INDEX "IDX_corporate_nudge_email_logs_sent" ON "corporate_nudge_email_logs" ("sentAt")`,
        );
        await queryRunner.query(
          `CREATE INDEX "IDX_corporate_nudge_email_logs_email" ON "corporate_nudge_email_logs" ("toEmail")`,
        );
        console.log('✅ corporate_nudge_email_logs table created successfully');
      }

      const bulkUploadsExist = await queryRunner.hasTable('corporate_bulk_enrolment_uploads');
      if (!bulkUploadsExist) {
        await queryRunner.query(`
          CREATE TABLE "corporate_bulk_enrolment_uploads" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "companyCode" character varying(120) NOT NULL,
            "uploadedByUserId" uuid,
            "originalFileName" character varying(255) NOT NULL,
            "storedFileName" character varying(255) NOT NULL,
            "sizeBytes" bigint NOT NULL DEFAULT 0,
            "mimeType" character varying(120),
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_corporate_bulk_enrolment_uploads" PRIMARY KEY ("id")
          )
        `);
        await queryRunner.query(
          `CREATE INDEX "IDX_corporate_bulk_enrolment_uploads_company" ON "corporate_bulk_enrolment_uploads" ("companyCode")`,
        );
        await queryRunner.query(
          `CREATE INDEX "IDX_corporate_bulk_enrolment_uploads_created" ON "corporate_bulk_enrolment_uploads" ("createdAt")`,
        );
        console.log('✅ corporate_bulk_enrolment_uploads table created successfully');
      }

      const enrolBatchesExist = await queryRunner.hasTable('corporate_staff_enrol_batches');
      if (!enrolBatchesExist) {
        await queryRunner.query(`
          CREATE TABLE "corporate_staff_enrol_batches" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "companyCode" character varying(120) NOT NULL,
            "createdByUserId" uuid,
            "source" character varying(32) NOT NULL DEFAULT 'single',
            "fileName" character varying(255),
            "totalReceived" integer NOT NULL DEFAULT 0,
            "passedCount" integer NOT NULL DEFAULT 0,
            "skippedCount" integer NOT NULL DEFAULT 0,
            "message" character varying(512),
            "rows" jsonb,
            "summary" jsonb,
            "batches" jsonb,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_corporate_staff_enrol_batches" PRIMARY KEY ("id")
          )
        `);
        await queryRunner.query(
          `CREATE INDEX "IDX_corporate_staff_enrol_batches_company" ON "corporate_staff_enrol_batches" ("companyCode")`,
        );
        await queryRunner.query(
          `CREATE INDEX "IDX_corporate_staff_enrol_batches_created" ON "corporate_staff_enrol_batches" ("createdAt")`,
        );
        console.log('✅ corporate_staff_enrol_batches table created successfully');
      }
    } catch (error) {
      console.error(
        '❌ Error initializing corporate nudge tables:',
        error instanceof Error ? error.message : error,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
