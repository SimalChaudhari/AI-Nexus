import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { shouldSkipRuntimeSchemaInit } from '../common/schema-init-guard';

@Injectable()
export class CourseCertificateInitService implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    if (shouldSkipRuntimeSchemaInit()) {
      return;
    }
    try {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      const exists = await queryRunner.hasTable('course_certificates');
      if (!exists) {
        await queryRunner.query(`
          CREATE TABLE "course_certificates" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "userId" uuid NOT NULL,
            "courseId" uuid NOT NULL,
            "certificateNo" character varying(80) NOT NULL,
            "completedAt" TIMESTAMP NOT NULL DEFAULT now(),
            "status" character varying(20) NOT NULL DEFAULT 'active',
            "deletedAt" TIMESTAMP NULL,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_course_certificates" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_course_certificates_user_course" UNIQUE ("userId", "courseId"),
            CONSTRAINT "UQ_course_certificates_no" UNIQUE ("certificateNo"),
            CONSTRAINT "FK_course_certificates_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_course_certificates_course" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE
          )
        `);
        await queryRunner.query(`
          CREATE INDEX "IDX_course_certificates_user" ON "course_certificates" ("userId")
        `);
        await queryRunner.query(`
          CREATE INDEX "IDX_course_certificates_course" ON "course_certificates" ("courseId")
        `);
      }
      await queryRunner.query(`
        ALTER TABLE "course_certificates"
        ADD COLUMN IF NOT EXISTS "status" character varying(20) NOT NULL DEFAULT 'active'
      `);
      await queryRunner.query(`
        ALTER TABLE "course_certificates"
        ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP NULL
      `);
      await queryRunner.query(`
        ALTER TABLE "course_certificates"
        ADD COLUMN IF NOT EXISTS "programId" uuid NULL
      `);

      await queryRunner.release();
    } catch (error) {
      console.error(
        'Error initializing course_certificates table:',
        error instanceof Error ? error.message : error,
      );
    }
  }
}
