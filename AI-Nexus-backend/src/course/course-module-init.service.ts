import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class CourseModuleInitService implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    try {
      console.log('🔍 Checking course_modules table...');
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      const exists = await queryRunner.hasTable('course_modules');
      if (!exists) {
        console.log('📋 Creating course_modules table...');
        await queryRunner.query(`
          CREATE TABLE "course_modules" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "courseId" uuid NOT NULL,
            "sortOrder" int NOT NULL DEFAULT 0,
            "title" varchar(255) NOT NULL,
            "description" text,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_course_modules" PRIMARY KEY ("id"),
            CONSTRAINT "FK_course_modules_course" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE
          )
        `);
        console.log('✅ course_modules table created successfully');
      } else {
        console.log('✅ course_modules table already exists');
      }

      await queryRunner.release();
    } catch (error) {
      console.error('❌ Error initializing course_modules table:', error instanceof Error ? error.message : error);
    }
  }
}
