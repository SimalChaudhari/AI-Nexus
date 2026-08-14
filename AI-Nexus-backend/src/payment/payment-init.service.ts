import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { shouldSkipRuntimeSchemaInit } from '../common/schema-init-guard';

@Injectable()
export class PaymentInitService implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    if (shouldSkipRuntimeSchemaInit()) {
      return;
    }
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();

      const exists = await queryRunner.hasTable('payments');
      if (!exists) {
        await queryRunner.query(`
          CREATE TABLE "payments" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "userId" uuid NOT NULL,
            "orderId" uuid,
            "clientReferenceId" varchar(512) NOT NULL,
            "status" varchar(50) NOT NULL DEFAULT 'pending',
            "amount" decimal(12,2) NOT NULL DEFAULT 0,
            "currency" varchar(10) NOT NULL DEFAULT 'SGD',
            "courseIds" text NOT NULL,
            "items" jsonb,
            "wooshpaySessionId" varchar(255),
            "wooshpayPaymentIntentId" varchar(255),
            "paymentMethod" varchar(80),
            "eventType" varchar(100),
            "source" varchar(50),
            "failureReason" varchar(512),
            "paidAt" TIMESTAMP,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_payments" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_payments_clientReferenceId" UNIQUE ("clientReferenceId"),
            CONSTRAINT "FK_payments_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_payments_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL
          )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_payments_userId" ON "payments" ("userId")`);
        await queryRunner.query(`CREATE INDEX "IDX_payments_status" ON "payments" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_payments_createdAt" ON "payments" ("createdAt")`);
        await queryRunner.query(
          `CREATE INDEX "IDX_payments_wooshpaySessionId" ON "payments" ("wooshpaySessionId")`,
        );
        console.log('✅ payments table created successfully');
      } else {
        await queryRunner.query(
          `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "paymentMethod" varchar(80)`,
        );
      }

      await this.backfillFromOrders(queryRunner);
    } catch (error) {
      console.error(
        '❌ Error initializing payments table:',
        error instanceof Error ? error.message : error,
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Preserve historical payment status from existing orders rows.
   * Idempotent: only inserts clientReferenceIds not already in payments.
   */
  private async backfillFromOrders(queryRunner: {
    hasTable: (name: string) => Promise<boolean>;
    query: (sql: string) => Promise<unknown>;
  }): Promise<void> {
    const ordersExists = await queryRunner.hasTable('orders');
    const paymentsExists = await queryRunner.hasTable('payments');
    if (!ordersExists || !paymentsExists) {
      return;
    }

    const beforeRows = await queryRunner.query(`SELECT COUNT(*)::int AS count FROM "payments"`);
    const beforeCount = Number((beforeRows as Array<{ count: number }>)?.[0]?.count || 0);

    await queryRunner.query(`
      INSERT INTO "payments" (
        "id",
        "userId",
        "orderId",
        "clientReferenceId",
        "status",
        "amount",
        "currency",
        "courseIds",
        "items",
        "wooshpaySessionId",
        "wooshpayPaymentIntentId",
        "eventType",
        "source",
        "failureReason",
        "paidAt",
        "createdAt",
        "updatedAt"
      )
      SELECT
        gen_random_uuid(),
        o."userId",
        o."id",
        o."clientReferenceId",
        CASE
          WHEN LOWER(COALESCE(o."paymentStatus", '')) = 'paid' THEN 'paid'
          WHEN LOWER(COALESCE(o."paymentStatus", '')) IN ('canceled', 'cancelled') THEN 'canceled'
          WHEN LOWER(COALESCE(o."paymentStatus", '')) = 'webhook_verification_failed'
            THEN 'webhook_verification_failed'
          WHEN LOWER(COALESCE(o."paymentStatus", '')) = 'refunded' THEN 'refunded'
          WHEN LOWER(COALESCE(o."paymentStatus", '')) IN ('failed', 'expired') THEN 'failed'
          WHEN LOWER(o."status") = 'completed' THEN 'paid'
          WHEN LOWER(o."status") IN ('failed', 'cancelled', 'canceled') THEN 'failed'
          WHEN LOWER(o."status") = 'refunded' THEN 'refunded'
          WHEN LOWER(o."status") = 'pending' THEN 'pending'
          ELSE COALESCE(NULLIF(LOWER(o."paymentStatus"), ''), 'paid')
        END,
        COALESCE(o."totalAmount", 0),
        COALESCE(o."currency", 'SGD'),
        COALESCE(o."courseIds", ''),
        o."items",
        o."wooshpaySessionId",
        o."wooshpayPaymentIntentId",
        o."eventType",
        'backfill',
        CASE
          WHEN LOWER(COALESCE(o."paymentStatus", '')) = 'paid'
            OR (o."paymentStatus" IS NULL AND LOWER(o."status") = 'completed')
            THEN NULL
          ELSE COALESCE(o."paymentStatus", o."status")
        END,
        CASE
          WHEN LOWER(COALESCE(o."paymentStatus", '')) = 'paid'
            OR (o."paymentStatus" IS NULL AND LOWER(o."status") = 'completed')
            THEN o."createdAt"
          ELSE NULL
        END,
        o."createdAt",
        o."createdAt"
      FROM (
        SELECT DISTINCT ON ("clientReferenceId")
          "id",
          "userId",
          "clientReferenceId",
          "paymentStatus",
          "status",
          "totalAmount",
          "currency",
          "courseIds",
          "items",
          "wooshpaySessionId",
          "wooshpayPaymentIntentId",
          "eventType",
          "createdAt"
        FROM "orders"
        WHERE "clientReferenceId" IS NOT NULL
          AND TRIM("clientReferenceId") <> ''
        ORDER BY "clientReferenceId", "createdAt" DESC
      ) o
      WHERE NOT EXISTS (
        SELECT 1
        FROM "payments" p
        WHERE p."clientReferenceId" = o."clientReferenceId"
      )
    `);

    const afterRows = await queryRunner.query(`SELECT COUNT(*)::int AS count FROM "payments"`);
    const afterCount = Number((afterRows as Array<{ count: number }>)?.[0]?.count || 0);
    const inserted = Math.max(0, afterCount - beforeCount);

    if (inserted > 0) {
      console.log(`✅ payments backfill: ${inserted} row(s) copied from orders`);
    }
  }
}

