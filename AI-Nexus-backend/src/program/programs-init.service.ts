import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { shouldSkipRuntimeSchemaInit } from '../common/schema-init-guard';

@Injectable()
export class ProgramsInitService implements OnModuleInit {
    constructor(private dataSource: DataSource) {}

    async onModuleInit() {
        if (shouldSkipRuntimeSchemaInit()) {
            return;
        }
        try {
            const queryRunner = this.dataSource.createQueryRunner();
            await queryRunner.connect();

            const exists = await queryRunner.hasTable('programs');
            if (!exists) {
                await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "programs" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "title" varchar NOT NULL,
            "description" text,
            "status" varchar NOT NULL DEFAULT 'active',
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_programs" PRIMARY KEY ("id")
          )
        `);
            } else {
                await queryRunner.query(
                    `ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "pillar1CourseId" uuid`,
                );
                await queryRunner.query(
                    `ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "pillar2CourseId" uuid`,
                );
                await queryRunner.query(
                    `ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "pillar3CourseId" uuid`,
                );
                await queryRunner.query(`ALTER TABLE "programs" DROP COLUMN IF EXISTS "tracks"`);
                await queryRunner.query(
                    `ALTER TABLE "programs" ALTER COLUMN "pillar1CourseId" DROP NOT NULL`,
                );
                await queryRunner.query(
                    `ALTER TABLE "programs" ALTER COLUMN "pillar2CourseId" DROP NOT NULL`,
                );
                await queryRunner.query(
                    `ALTER TABLE "programs" ALTER COLUMN "pillar3CourseId" DROP NOT NULL`,
                );
                // Legacy pillar category columns — optional; courses link via course.programId instead.
                await queryRunner.query(
                    `ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "pillar1CategoryId" uuid`,
                );
                await queryRunner.query(
                    `ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "pillar2CategoryId" uuid`,
                );
                await queryRunner.query(
                    `ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "pillar3CategoryId" uuid`,
                );
                await queryRunner.query(
                    `ALTER TABLE "programs" ALTER COLUMN "pillar1CategoryId" DROP NOT NULL`,
                );
                await queryRunner.query(
                    `ALTER TABLE "programs" ALTER COLUMN "pillar2CategoryId" DROP NOT NULL`,
                );
                await queryRunner.query(
                    `ALTER TABLE "programs" ALTER COLUMN "pillar3CategoryId" DROP NOT NULL`,
                );
            }

            await queryRunner.release();
        } catch (error) {
            console.error(
                'Error initializing programs table:',
                error instanceof Error ? error.message : error,
            );
        }
    }
}
