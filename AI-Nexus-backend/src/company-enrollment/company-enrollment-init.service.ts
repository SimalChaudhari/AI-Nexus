import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { shouldSkipRuntimeSchemaInit } from '../common/schema-init-guard';

@Injectable()
export class CompanyEnrollmentInitService implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    if (shouldSkipRuntimeSchemaInit()) {
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();

      if (!(await queryRunner.hasTable('company_enrollment_invites'))) {
        await queryRunner.query(`
          CREATE TABLE "company_enrollment_invites" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "companyCode" varchar(64) NOT NULL,
            "label" varchar(255),
            "isActive" boolean NOT NULL DEFAULT true,
            "maxEnrollment" int NOT NULL DEFAULT 0,
            "enrolledCount" int NOT NULL DEFAULT 0,
            "qrValidTill" TIMESTAMP,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_company_enrollment_invites" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_company_enrollment_invites_companyCode" UNIQUE ("companyCode")
          )
        `);
        await queryRunner.query(
          `CREATE INDEX "IDX_company_enrollment_invites_companyCode" ON "company_enrollment_invites" ("companyCode")`,
        );
        console.log('✅ company_enrollment_invites table created');
      }
    } catch (error) {
      console.error(
        '❌ Error initializing company_enrollment_invites table:',
        error instanceof Error ? error.message : error,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
