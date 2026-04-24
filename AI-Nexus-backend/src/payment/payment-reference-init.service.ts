import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { shouldSkipRuntimeSchemaInit } from '../common/schema-init-guard';

@Injectable()
export class PaymentReferenceInitService implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    if (shouldSkipRuntimeSchemaInit()) {
      return;
    }
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();

      const exists = await queryRunner.hasTable('payment_references');
      if (!exists) {
        await queryRunner.query(`
          CREATE TABLE "payment_references" (
            "id" varchar(32) NOT NULL,
            "userId" uuid NOT NULL,
            "courseIds" text NOT NULL,
            "items" jsonb,
            "wooshpaySessionId" varchar(255),
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_payment_references" PRIMARY KEY ("id"),
            CONSTRAINT "FK_payment_references_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
          )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_payment_references_userId" ON "payment_references" ("userId")`);
        console.log('✅ payment_references table created successfully');
      }
      // Backward-compatible patch for existing databases.
      // If table exists but column is missing, add it without data loss.
      const hasSessionIdColumn = await queryRunner.query(`
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'payment_references'
          AND column_name = 'wooshpaySessionId'
        LIMIT 1
      `);
      if (!hasSessionIdColumn?.length) {
        await queryRunner.query(
          `ALTER TABLE "payment_references" ADD COLUMN "wooshpaySessionId" varchar(255)`
        );
        console.log('✅ payment_references.wooshpaySessionId column added successfully');
      }
    } catch (error) {
      console.error(
        '❌ Error initializing payment_references table:',
        error instanceof Error ? error.message : error,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
