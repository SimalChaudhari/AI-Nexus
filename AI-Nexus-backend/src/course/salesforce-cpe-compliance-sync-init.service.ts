import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { shouldSkipRuntimeSchemaInit } from '../common/schema-init-guard';

@Injectable()
export class SalesforceCpeComplianceSyncInitService implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    if (shouldSkipRuntimeSchemaInit()) {
      return;
    }
    try {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      const exists = await queryRunner.hasTable('salesforce_cpe_compliance_sync');
      if (!exists) {
        await queryRunner.query(`
          CREATE TABLE "salesforce_cpe_compliance_sync" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "userId" uuid NOT NULL,
            "courseId" uuid NOT NULL,
            "programId" uuid NULL,
            "cpeYear" character varying(8) NOT NULL,
            "lastNoOfCpeHours" numeric(6,2) NOT NULL DEFAULT 0,
            "lastHoursAllocated" numeric(6,2) NOT NULL DEFAULT 0,
            "lastCourseTitle" character varying(255) NOT NULL DEFAULT '',
            "salesforceRecordId" character varying(32) NULL,
            "lastSyncedAt" TIMESTAMP NULL,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_salesforce_cpe_compliance_sync" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_salesforce_cpe_compliance_sync_user_course_year" UNIQUE ("userId", "courseId", "cpeYear"),
            CONSTRAINT "FK_salesforce_cpe_compliance_sync_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_salesforce_cpe_compliance_sync_course" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE
          )
        `);
        await queryRunner.query(`
          CREATE INDEX "IDX_salesforce_cpe_compliance_sync_user" ON "salesforce_cpe_compliance_sync" ("userId")
        `);
        await queryRunner.query(`
          CREATE INDEX "IDX_salesforce_cpe_compliance_sync_course" ON "salesforce_cpe_compliance_sync" ("courseId")
        `);
      }

      await queryRunner.release();
    } catch (error) {
      console.error(
        'Error initializing salesforce_cpe_compliance_sync table:',
        error instanceof Error ? error.message : error,
      );
    }
  }
}
