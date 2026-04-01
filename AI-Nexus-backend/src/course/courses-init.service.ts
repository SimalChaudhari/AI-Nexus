import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class CoursesInitService implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
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
            "languageIds" jsonb,
            "speakerIds" jsonb,
            "marketData" jsonb,
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
          VALUES ('Beginner', true), ('Intermediate', true), ('Advance', true)
          ON CONFLICT ("name") DO NOTHING
        `);
        console.log('✅ course_groups table created successfully');
      } else {
        console.log('✅ course_groups table already exists');
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
