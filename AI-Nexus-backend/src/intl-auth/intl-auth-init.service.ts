import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class IntlAuthInitService implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      await this.ensureTables();
    } catch (error) {
      console.error(
        '❌ Error initializing international auth tables:',
        error instanceof Error ? error.message : error,
      );
    }
  }

  private async ensureTables() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const hasUsers = await queryRunner.hasTable('international_users');
      if (!hasUsers) {
        console.log('📋 Creating international_users table...');
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "international_users" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "email" varchar(120) NOT NULL,
            "username" varchar(120),
            "salutation" varchar(20),
            "firstname" varchar(80) NOT NULL,
            "lastname" varchar(80) NOT NULL,
            "password" varchar,
            "authProvider" varchar(16) NOT NULL DEFAULT 'LOCAL',
            "socialId" varchar,
            "socialAccessToken" varchar,
            "avatarUrl" varchar,
            "contactNumber" varchar(48),
            "companyCode" varchar(64),
            "company" varchar(200),
            "jobFunction" varchar(80),
            "jobFunctionOther" varchar(200),
            "yearsOfExperience" int,
            "countryOfResidence" varchar(120),
            "countryCode" varchar(8),
            "currency" varchar(10),
            "promoCode" varchar(64),
            "paymentStatus" varchar(16) NOT NULL DEFAULT 'unpaid',
            "isVerified" boolean NOT NULL DEFAULT false,
            "status" varchar(16) NOT NULL DEFAULT 'pending_payment',
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_international_users" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_international_users_email" UNIQUE ("email"),
            CONSTRAINT "UQ_international_users_username" UNIQUE ("username")
          )
        `);
        console.log('✅ international_users created');
      } else {
        await queryRunner.query(
          `ALTER TABLE "international_users" ADD COLUMN IF NOT EXISTS "countryCode" varchar(8)`,
        );
        await queryRunner.query(
          `ALTER TABLE "international_users" ADD COLUMN IF NOT EXISTS "currency" varchar(10)`,
        );
        await queryRunner.query(
          `ALTER TABLE "international_users" ADD COLUMN IF NOT EXISTS "paymentStatus" varchar(16) NOT NULL DEFAULT 'unpaid'`,
        );
      }
    } finally {
      await queryRunner.release();
    }
  }
}
