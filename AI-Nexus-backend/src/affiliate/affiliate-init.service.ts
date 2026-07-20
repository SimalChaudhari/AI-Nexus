import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { shouldSkipRuntimeSchemaInit } from '../common/schema-init-guard';

@Injectable()
export class AffiliateInitService implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    if (shouldSkipRuntimeSchemaInit()) {
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();

      if (!(await queryRunner.hasTable('affiliate_codes'))) {
        await queryRunner.query(`
          CREATE TABLE "affiliate_codes" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "code" varchar(64) NOT NULL,
            "label" varchar(255),
            "ownerUserId" uuid,
            "isActive" boolean NOT NULL DEFAULT true,
            "expiresAt" TIMESTAMP,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_affiliate_codes" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_affiliate_codes_code" UNIQUE ("code")
          )
        `);
        console.log('✅ affiliate_codes table created');
      }

      if (!(await queryRunner.hasTable('voucher_codes'))) {
        await queryRunner.query(`
          CREATE TABLE "voucher_codes" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "code" varchar(64) NOT NULL,
            "label" varchar(255),
            "isActive" boolean NOT NULL DEFAULT true,
            "expiresAt" TIMESTAMP,
            "maxRedemptions" int,
            "redemptionCount" int NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_voucher_codes" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_voucher_codes_code" UNIQUE ("code")
          )
        `);
        console.log('✅ voucher_codes table created');
      }

      if (!(await queryRunner.hasTable('affiliate_clicks'))) {
        await queryRunner.query(`
          CREATE TABLE "affiliate_clicks" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "affiliateCode" varchar(64) NOT NULL,
            "landingPath" varchar(512),
            "ipHash" varchar(64),
            "userAgent" varchar(255),
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_affiliate_clicks" PRIMARY KEY ("id")
          )
        `);
        await queryRunner.query(
          `CREATE INDEX "IDX_affiliate_clicks_affiliateCode" ON "affiliate_clicks" ("affiliateCode")`,
        );
        console.log('✅ affiliate_clicks table created');
      }

      if (!(await queryRunner.hasTable('affiliate_sales'))) {
        await queryRunner.query(`
          CREATE TABLE "affiliate_sales" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "draftUserId" uuid NOT NULL,
            "userId" uuid,
            "affiliateCode" varchar(64),
            "voucherCode" varchar(64),
            "discountApplied" boolean NOT NULL DEFAULT false,
            "originalAmount" decimal(12,2) NOT NULL,
            "payableAmount" decimal(12,2) NOT NULL,
            "currency" varchar(10) NOT NULL DEFAULT 'SGD',
            "paymentRefId" varchar(64),
            "status" varchar(32) NOT NULL DEFAULT 'pending',
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            "paidAt" TIMESTAMP,
            CONSTRAINT "PK_affiliate_sales" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_affiliate_sales_paymentRefId" UNIQUE ("paymentRefId")
          )
        `);
        await queryRunner.query(
          `CREATE INDEX "IDX_affiliate_sales_draftUserId" ON "affiliate_sales" ("draftUserId")`,
        );
        await queryRunner.query(
          `CREATE INDEX "IDX_affiliate_sales_affiliateCode" ON "affiliate_sales" ("affiliateCode")`,
        );
        console.log('✅ affiliate_sales table created');
      }

      // Tables only — do not seed demo voucher codes (admin manages vouchers).
      await this.seedDefaultAffiliateCode(queryRunner);
    } catch (error) {
      console.error(
        '❌ Error initializing affiliate tables:',
        error instanceof Error ? error.message : error,
      );
    } finally {
      await queryRunner.release();
    }
  }

  private async seedDefaultAffiliateCode(queryRunner: {
    query: (sql: string, params?: unknown[]) => Promise<unknown>;
  }) {
    await queryRunner.query(
      `
      INSERT INTO "affiliate_codes" ("code", "label", "isActive")
      SELECT 'SP001', 'Default salesperson affiliate', true
      WHERE NOT EXISTS (SELECT 1 FROM "affiliate_codes" WHERE UPPER("code") = 'SP001')
      `,
    );
  }
}
