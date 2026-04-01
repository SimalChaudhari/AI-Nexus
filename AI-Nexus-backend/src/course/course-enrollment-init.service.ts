import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class CourseEnrollmentInitService implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    try {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      const exists = await queryRunner.hasTable('course_enrollments');
      if (!exists) {
        await queryRunner.query(`
          CREATE TABLE "course_enrollments" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "userId" uuid NOT NULL,
            "courseId" uuid NOT NULL,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_course_enrollments" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_course_enrollments_user_course" UNIQUE ("userId", "courseId"),
            CONSTRAINT "FK_course_enrollments_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_course_enrollments_course" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE
          )
        `);
        console.log('✅ course_enrollments table created successfully');
      }

      await queryRunner.release();
    } catch (error) {
      console.error(
        '❌ Error initializing course_enrollments table:',
        error instanceof Error ? error.message : error,
      );
    }
  }
}
