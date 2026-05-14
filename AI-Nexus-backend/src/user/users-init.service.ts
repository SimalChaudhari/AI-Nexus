import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { shouldSkipRuntimeSchemaInit } from '../common/schema-init-guard';

@Injectable()
export class UsersInitService implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    if (shouldSkipRuntimeSchemaInit()) {
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();

      const usersTableExists = await queryRunner.hasTable('users');
      if (!usersTableExists) {
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "users" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "username" varchar UNIQUE,
            "firstname" varchar NOT NULL,
            "lastname" varchar NOT NULL,
            "email" varchar UNIQUE,
            "persona" varchar,
            "aiExperienceLevel" varchar,
            "aiLearningGoals" jsonb,
            "aiUseAreas" jsonb,
            "financeRole" varchar,
            "password" varchar,
            "authProvider" varchar NOT NULL DEFAULT 'LOCAL',
            "socialId" varchar,
            "socialAccessToken" varchar,
            "avatarUrl" varchar,
            "isVerified" boolean NOT NULL DEFAULT false,
            "isDraft" boolean NOT NULL DEFAULT false,
            "role" varchar NOT NULL DEFAULT 'User',
            "status" varchar NOT NULL DEFAULT 'active',
            "verificationToken" varchar,
            "verificationTokenExpires" TIMESTAMP,
            "resetToken" varchar,
            "resetTokenExpires" TIMESTAMP,
            "signupAccessTokenHash" varchar,
            "signupAccessTokenExpiresAt" TIMESTAMP,
            "nricFinType" varchar,
            "nricFinSeries" varchar,
            "nricFinValue" varchar,
            "nricFinMasked" varchar,
            "nricFinCanonicalValue" varchar,
            "nricFinCanonicalMasked" varchar,
            "nricFinValueEncrypted" text,
            "nricFinCanonicalHash" varchar,
            "nricExtractedFullName" varchar,
            "nricExtractedDateOfBirth" varchar,
            "nricExtractedNationality" varchar,
            "nricExtractedSex" varchar,
            "nricExtractedAddress" text,
            "nricVerificationConfidence" double precision,
            "spPrStatusVerified" boolean NOT NULL DEFAULT false,
            "nricVerificationSource" varchar,
            "spPrStatusVerifiedAt" TIMESTAMP,
            "eligibilityIsSingaporePr" boolean,
            "eligibilityIsIscaMember" boolean,
            "eligibilityWantsMembership" boolean,
            "eligibilityType" varchar,
            "eligibilitySnapshot" jsonb,
            "eligibilityCheckedAt" TIMESTAMP,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_users" PRIMARY KEY ("id")
          )
        `);
        console.log('✅ Users table created successfully');
      }

      const avatarColumnExists = await queryRunner.query(`
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
          AND column_name = 'avatarUrl'
        LIMIT 1
      `);

      if (!avatarColumnExists.length) {
        await queryRunner.query(`
          ALTER TABLE "users"
          ADD COLUMN IF NOT EXISTS "avatarUrl" varchar
        `);
        console.log('✅ Added users.avatarUrl column');
      }

      const personaColumnExists = await queryRunner.query(`
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
          AND column_name = 'persona'
        LIMIT 1
      `);

      if (!personaColumnExists.length) {
        await queryRunner.query(`
          ALTER TABLE "users"
          ADD COLUMN IF NOT EXISTS "persona" varchar
        `);
        console.log('✅ Added users.persona column');
      }

      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "aiExperienceLevel" varchar
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ALTER COLUMN "username" DROP NOT NULL
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ALTER COLUMN "email" DROP NOT NULL
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "signupAccessTokenHash" varchar
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "signupAccessTokenExpiresAt" TIMESTAMP
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "aiLearningGoals" jsonb
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "aiUseAreas" jsonb
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "financeRole" varchar
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "isDraft" boolean NOT NULL DEFAULT false
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "nricFinType" varchar
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "nricFinSeries" varchar
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "nricFinValue" varchar
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "nricFinMasked" varchar
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "nricFinCanonicalValue" varchar
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "nricFinCanonicalMasked" varchar
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "nricFinValueEncrypted" text
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "nricFinCanonicalHash" varchar
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "nricExtractedFullName" varchar
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "nricExtractedDateOfBirth" varchar
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "nricExtractedNationality" varchar
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "nricExtractedSex" varchar
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "nricExtractedAddress" text
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "nricVerificationConfidence" double precision
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "spPrStatusVerified" boolean NOT NULL DEFAULT false
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "nricVerificationSource" varchar
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "spPrStatusVerifiedAt" TIMESTAMP
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "eligibilityIsSingaporePr" boolean
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "eligibilityIsIscaMember" boolean
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "eligibilityWantsMembership" boolean
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "eligibilityType" varchar
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "eligibilitySnapshot" jsonb
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "eligibilityCheckedAt" TIMESTAMP
      `);
      await queryRunner.query(`
        DO $REN$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'phoneNumber'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'contactNumber'
          ) THEN
            ALTER TABLE "users" RENAME COLUMN "phoneNumber" TO "contactNumber";
          END IF;
        END $REN$
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "contactNumber" varchar(48)
      `);
    } catch (error) {
      console.error(
        '❌ Error ensuring users profile columns:',
        error instanceof Error ? error.message : error,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
