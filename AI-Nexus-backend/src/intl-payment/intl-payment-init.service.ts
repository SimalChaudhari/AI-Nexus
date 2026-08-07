import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class IntlPaymentInitService implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      await this.ensureTables();
      await this.ensureUserPaymentColumns();
    } catch (error) {
      console.error(
        '❌ Error initializing international payment tables:',
        error instanceof Error ? error.message : error,
      );
    }
  }

  private async ensureTables() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const hasPayments = await queryRunner.hasTable('international_payments');
      if (!hasPayments) {
        console.log('📋 Creating international_payments table...');
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "international_payments" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "userId" uuid NOT NULL,
            "clientReferenceId" varchar(64) NOT NULL,
            "status" varchar(32) NOT NULL DEFAULT 'pending',
            "amount" decimal(12,2) NOT NULL DEFAULT 0,
            "currency" varchar(10) NOT NULL DEFAULT 'USD',
            "countryCode" varchar(8),
            "countryOfResidence" varchar(120),
            "promoCode" varchar(64),
            "promoApplied" boolean NOT NULL DEFAULT false,
            "applyGst" boolean NOT NULL DEFAULT false,
            "gstAmount" decimal(12,2) NOT NULL DEFAULT 0,
            "items" jsonb,
            "wooshpaySessionId" varchar(255),
            "wooshpayPaymentIntentId" varchar(255),
            "eventType" varchar(100),
            "failureReason" varchar(512),
            "paidAt" TIMESTAMP,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_international_payments" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_international_payments_clientReferenceId" UNIQUE ("clientReferenceId"),
            CONSTRAINT "FK_international_payments_userId"
              FOREIGN KEY ("userId") REFERENCES "international_users"("id") ON DELETE CASCADE
          )
        `);
        await queryRunner.query(
          `CREATE INDEX IF NOT EXISTS "IDX_international_payments_userId" ON "international_payments" ("userId")`,
        );
        await queryRunner.query(
          `CREATE INDEX IF NOT EXISTS "IDX_international_payments_status" ON "international_payments" ("status")`,
        );
        await queryRunner.query(
          `CREATE INDEX IF NOT EXISTS "IDX_international_payments_session" ON "international_payments" ("wooshpaySessionId")`,
        );
        console.log('✅ international_payments created');
      }
    } finally {
      await queryRunner.release();
    }
  }

  private async ensureUserPaymentColumns() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const hasUsers = await queryRunner.hasTable('international_users');
      if (!hasUsers) return;

      const columns: Array<{ name: string; sql: string }> = [
        {
          name: 'countryCode',
          sql: `ALTER TABLE "international_users" ADD COLUMN IF NOT EXISTS "countryCode" varchar(8)`,
        },
        {
          name: 'currency',
          sql: `ALTER TABLE "international_users" ADD COLUMN IF NOT EXISTS "currency" varchar(10)`,
        },
        {
          name: 'paymentStatus',
          sql: `ALTER TABLE "international_users" ADD COLUMN IF NOT EXISTS "paymentStatus" varchar(16) NOT NULL DEFAULT 'unpaid'`,
        },
      ];

      for (const col of columns) {
        await queryRunner.query(col.sql);
      }
    } finally {
      await queryRunner.release();
    }
  }
}
