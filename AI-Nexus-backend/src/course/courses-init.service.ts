import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { shouldSkipRuntimeSchemaInit } from '../common/schema-init-guard';

@Injectable()
export class CoursesInitService implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    if (shouldSkipRuntimeSchemaInit()) {
      return;
    }
    try {
      console.log('🔍 Checking courses table...');
      
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      const coursesExists = await queryRunner.hasTable('courses');
      if (!coursesExists) {
        console.log('📋 Creating courses table...');
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "courses" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "title" varchar NOT NULL,
            "description" text,
            "image" text,
            "freeOrPaid" boolean NOT NULL DEFAULT false,
            "amount" decimal(10,2) DEFAULT 0,
            "level" varchar NOT NULL DEFAULT 'Beginner',
            "categoryId" uuid,
            "roles" jsonb,
            "aiLevel" jsonb,
            "goals" jsonb,
            "useAreas" jsonb,
            "languageIds" jsonb,
            "speakerIds" jsonb,
            "marketData" jsonb,
            "isBundle" boolean NOT NULL DEFAULT false,
            "bundleCourseIds" jsonb,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_courses" PRIMARY KEY ("id")
          )
        `);
        console.log('✅ Courses table created successfully');
      } else {
        console.log('✅ Courses table already exists');
        // Drop deprecated columns if they exist (video, review removed from schema)
        const hasVideoColumn = await queryRunner.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'courses' AND column_name = 'video'
        `);
        if (hasVideoColumn?.length) {
          console.log('📋 Dropping deprecated video column from courses table...');
          await queryRunner.query(`ALTER TABLE "courses" DROP COLUMN IF EXISTS "video"`);
          console.log('✅ video column dropped');
        }
        const hasReviewColumn = await queryRunner.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'courses' AND column_name = 'review'
        `);
        if (hasReviewColumn?.length) {
          console.log('📋 Dropping deprecated review column from courses table...');
          await queryRunner.query(`ALTER TABLE "courses" DROP COLUMN IF EXISTS "review"`);
          console.log('✅ review column dropped');
        }

        const hasLanguageIdsColumn = await queryRunner.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'courses' AND column_name = 'languageIds'
        `);
        if (!hasLanguageIdsColumn?.length) {
          console.log('📋 Adding languageIds column to courses table...');
          await queryRunner.query(`ALTER TABLE "courses" ADD COLUMN "languageIds" jsonb`);
          console.log('✅ languageIds column added successfully');
        }

        const hasRolesColumn = await queryRunner.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'courses' AND column_name = 'roles'
        `);
        if (!hasRolesColumn?.length) {
          console.log('📋 Adding roles column to courses table...');
          await queryRunner.query(`ALTER TABLE "courses" ADD COLUMN "roles" jsonb`);
          console.log('✅ roles column added successfully');
        }

        const hasCategoryIdColumn = await queryRunner.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'courses' AND column_name = 'categoryId'
        `);
        if (!hasCategoryIdColumn?.length) {
          console.log('📋 Adding categoryId column to courses table...');
          await queryRunner.query(`ALTER TABLE "courses" ADD COLUMN "categoryId" uuid`);
          console.log('✅ categoryId column added successfully');
        }

        const hasAiLevelColumn = await queryRunner.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'courses' AND column_name = 'aiLevel'
        `);
        if (!hasAiLevelColumn?.length) {
          console.log('📋 Adding aiLevel column to courses table...');
          await queryRunner.query(`ALTER TABLE "courses" ADD COLUMN "aiLevel" jsonb`);
          console.log('✅ aiLevel column added successfully');
        }

        const hasGoalsColumn = await queryRunner.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'courses' AND column_name = 'goals'
        `);
        if (!hasGoalsColumn?.length) {
          console.log('📋 Adding goals column to courses table...');
          await queryRunner.query(`ALTER TABLE "courses" ADD COLUMN "goals" jsonb`);
          console.log('✅ goals column added successfully');
        }

        const hasUseAreasColumn = await queryRunner.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'courses' AND column_name = 'useAreas'
        `);
        if (!hasUseAreasColumn?.length) {
          console.log('📋 Adding useAreas column to courses table...');
          await queryRunner.query(`ALTER TABLE "courses" ADD COLUMN "useAreas" jsonb`);
          console.log('✅ useAreas column added successfully');
        }

        // Migrate spikerIds -> speakerIds if old column exists
        const hasSpikerIdsColumn = await queryRunner.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'courses' AND column_name = 'spikerIds'
        `);
        const hasSpeakerIdsColumn = await queryRunner.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'courses' AND column_name = 'speakerIds'
        `);
        if (hasSpikerIdsColumn?.length && !hasSpeakerIdsColumn?.length) {
          console.log('📋 Migrating spikerIds to speakerIds in courses table...');
          await queryRunner.query(`ALTER TABLE "courses" RENAME COLUMN "spikerIds" TO "speakerIds"`);
          console.log('✅ spikerIds renamed to speakerIds');
        } else if (!hasSpeakerIdsColumn?.length) {
          console.log('📋 Adding speakerIds column to courses table...');
          await queryRunner.query(`ALTER TABLE "courses" ADD COLUMN "speakerIds" jsonb`);
          console.log('✅ speakerIds column added successfully');
        }

        const hasMarketDataColumn = await queryRunner.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'courses' AND column_name = 'marketData'
        `);
        if (!hasMarketDataColumn?.length) {
          console.log('📋 Adding marketData column to courses table...');
          await queryRunner.query(`ALTER TABLE "courses" ADD COLUMN "marketData" jsonb`);
          console.log('✅ marketData column added successfully');
        }

        const hasIsBundleColumn = await queryRunner.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'courses' AND column_name = 'isBundle'
        `);
        if (!hasIsBundleColumn?.length) {
          console.log('📋 Adding isBundle column to courses table...');
          await queryRunner.query(
            `ALTER TABLE "courses" ADD COLUMN "isBundle" boolean NOT NULL DEFAULT false`,
          );
          console.log('✅ isBundle column added successfully');
        }

        const hasBundleCourseIdsColumn = await queryRunner.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'courses' AND column_name = 'bundleCourseIds'
        `);
        if (!hasBundleCourseIdsColumn?.length) {
          console.log('📋 Adding bundleCourseIds column to courses table...');
          await queryRunner.query(`ALTER TABLE "courses" ADD COLUMN "bundleCourseIds" jsonb`);
          console.log('✅ bundleCourseIds column added successfully');
        }

        const hasProgramIdColumn = await queryRunner.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'courses' AND column_name = 'programId'
        `);
        if (!hasProgramIdColumn?.length) {
          console.log('📋 Adding programId column to courses table...');
          await queryRunner.query(`ALTER TABLE "courses" ADD COLUMN "programId" uuid`);
          console.log('✅ programId column added successfully');
        }

        const hasProgramPillarIndexColumn = await queryRunner.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'courses' AND column_name = 'programPillarIndex'
        `);
        if (!hasProgramPillarIndexColumn?.length) {
          console.log('📋 Adding programPillarIndex column to courses table...');
          await queryRunner.query(`ALTER TABLE "courses" ADD COLUMN "programPillarIndex" smallint`);
          console.log('✅ programPillarIndex column added successfully');
        }

        await queryRunner.query(`
          UPDATE "courses"
          SET "programPillarIndex" = CASE
            WHEN lower(COALESCE("level"::text, '')) LIKE '%beginner%'
              OR lower(COALESCE("level"::text, '')) LIKE '%foundation%'
              OR lower(COALESCE("level"::text, '')) = 'basic' THEN 1
            WHEN lower(COALESCE("level"::text, '')) LIKE '%intermediate%'
              OR lower(COALESCE("level"::text, '')) LIKE '%workflow%' THEN 2
            WHEN lower(COALESCE("level"::text, '')) LIKE '%advanced%'
              OR lower(COALESCE("level"::text, '')) LIKE '%builder%'
              OR lower(COALESCE("level"::text, '')) = 'advance' THEN 3
            ELSE "programPillarIndex"
          END
          WHERE "programId" IS NOT NULL
            AND ("programPillarIndex" IS NULL OR "programPillarIndex" = 0)
        `);
      }

      console.log('🔍 Checking course_groups table...');
      const groupsExists = await queryRunner.hasTable('course_groups');
      if (!groupsExists) {
        console.log('📋 Creating course_groups table...');
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "course_groups" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "name" varchar(80) NOT NULL,
            "isActive" boolean NOT NULL DEFAULT true,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_course_groups" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_course_groups_name" UNIQUE ("name")
          )
        `);

        await queryRunner.query(`
          INSERT INTO "course_groups" ("name", "isActive")
          VALUES ('Beginner', true), ('Intermediate', true), ('Advanced', true)
          ON CONFLICT ("name") DO NOTHING
        `);
        console.log('✅ course_groups table created successfully');
      } else {
        console.log('✅ course_groups table already exists');
        await queryRunner.query(`
          UPDATE "course_groups"
          SET "name" = CASE
            WHEN lower("name") IN ('beginner', 'basic', 'ai foundation') THEN 'Beginner'
            WHEN lower("name") IN ('intermediate', 'ai in accounting workflows') THEN 'Intermediate'
            WHEN lower("name") IN ('advance', 'advanced', 'ai builder track') THEN 'Advanced'
            ELSE "name"
          END
          WHERE lower("name") IN (
            'beginner', 'basic', 'intermediate', 'advance', 'advanced',
            'ai foundation', 'ai in accounting workflows', 'ai builder track'
          )
        `);
      }

      // Check and create course_favorites table
      console.log('🔍 Checking course_favorites table...');
      const favoritesExists = await queryRunner.hasTable('course_favorites');
      if (!favoritesExists) {
        console.log('📋 Creating course_favorites table...');
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "course_favorites" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "userId" uuid NOT NULL,
            "courseId" uuid NOT NULL,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_course_favorites" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_course_favorites_user_course" UNIQUE ("userId", "courseId"),
            CONSTRAINT "FK_course_favorites_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_course_favorites_course" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE
          )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_course_favorites_userId" ON "course_favorites" ("userId")`);
        await queryRunner.query(`CREATE INDEX "IDX_course_favorites_courseId" ON "course_favorites" ("courseId")`);
        console.log('✅ course_favorites table created successfully');
      } else {
        console.log('✅ course_favorites table already exists');
      }

      // Performance indexes for Learning grouped/recommended queries.
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_courses_level_createdAt" ON "courses" ("level", "createdAt" DESC)`
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_courses_createdAt" ON "courses" ("createdAt" DESC)`
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_course_favorites_userId" ON "course_favorites" ("userId")`
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_course_favorites_courseId" ON "course_favorites" ("courseId")`
      );

      // Check and create course_section_favorites table
      console.log('🔍 Checking course_section_favorites table...');
      const sectionFavoritesExists = await queryRunner.hasTable('course_section_favorites');
      if (!sectionFavoritesExists) {
        console.log('📋 Creating course_section_favorites table...');
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "course_section_favorites" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "userId" uuid NOT NULL,
            "sectionId" uuid NOT NULL,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_course_section_favorites" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_course_section_favorites_user_section" UNIQUE ("userId", "sectionId"),
            CONSTRAINT "FK_course_section_favorites_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_course_section_favorites_section" FOREIGN KEY ("sectionId") REFERENCES "course_module_sections"("id") ON DELETE CASCADE
          )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_course_section_favorites_userId" ON "course_section_favorites" ("userId")`);
        await queryRunner.query(`CREATE INDEX "IDX_course_section_favorites_sectionId" ON "course_section_favorites" ("sectionId")`);
        console.log('✅ course_section_favorites table created successfully');
      } else {
        console.log('✅ course_section_favorites table already exists');
      }

      await queryRunner.release();
    } catch (error) {
      console.error('❌ Error initializing courses table:', error instanceof Error ? error.message : error);
    }
  }
}
