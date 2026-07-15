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
    } catch (error) {
      console.error(
        '❌ Error initializing corporate_learner_nudges table:',
        error instanceof Error ? error.message : error,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
