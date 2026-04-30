import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { shouldSkipRuntimeSchemaInit } from '../common/schema-init-guard';

@Injectable()
export class OrderInitService implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    if (shouldSkipRuntimeSchemaInit()) {
      return;
    }
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();

      const exists = await queryRunner.hasTable('orders');
      if (!exists) {
        await queryRunner.query(`
          CREATE TABLE "orders" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "userId" uuid NOT NULL,
            "courseIds" text NOT NULL,
            "items" jsonb,
            "totalAmount" decimal(12,2) NOT NULL DEFAULT 0,
            "currency" varchar(10) NOT NULL DEFAULT 'USD',
            "status" varchar(20) NOT NULL DEFAULT 'completed',
            "paymentStatus" varchar(50),
            "wooshpaySessionId" varchar(255),
            "wooshpayPaymentIntentId" varchar(255),
            "clientReferenceId" varchar(512) NOT NULL,
            "eventType" varchar(100),
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_orders" PRIMARY KEY ("id"),
            CONSTRAINT "FK_orders_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
          )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_orders_userId" ON "orders" ("userId")`);
        await queryRunner.query(`CREATE INDEX "IDX_orders_createdAt" ON "orders" ("createdAt")`);
        console.log('✅ orders table created successfully');
      }
    } catch (error) {
      console.error(
        '❌ Error initializing orders table:',
        error instanceof Error ? error.message : error,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
