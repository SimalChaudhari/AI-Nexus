import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { shouldSkipRuntimeSchemaInit } from '../common/schema-init-guard';
import { IntlPathwayModuleEntity } from './intl-pathway-module.entity';
import { IntlPathwayRoleEntity } from './intl-pathway-role.entity';
import { INTL_PATHWAY_MODULE_SEED, INTL_PATHWAY_ROLE_SEED } from './intl-pathway-seed';

@Injectable()
export class IntlPathwayInitService implements OnModuleInit {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(IntlPathwayModuleEntity)
    private readonly moduleRepository: Repository<IntlPathwayModuleEntity>,
    @InjectRepository(IntlPathwayRoleEntity)
    private readonly roleRepository: Repository<IntlPathwayRoleEntity>,
  ) {}

  async onModuleInit() {
    try {
      await this.ensureTables();
      await this.seedIfEmpty();
    } catch (error) {
      console.error(
        '❌ Error initializing intl pathway tables:',
        error instanceof Error ? error.message : error,
      );
    }
  }

  private async ensureTables() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const hasModules = await queryRunner.hasTable('intl_pathway_modules');
      if (!hasModules) {
        console.log('📋 Creating intl_pathway_modules table...');
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "intl_pathway_modules" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "code" varchar(20) NOT NULL,
            "title" varchar(255) NOT NULL,
            "pillar" varchar(10) NOT NULL,
            "minutes" int NOT NULL DEFAULT 0,
            "videoUrl" varchar(1000),
            "bullets" jsonb,
            "courseId" uuid,
            "moduleId" uuid,
            "sectionId" uuid,
            "sortOrder" int NOT NULL DEFAULT 0,
            "deleted" boolean NOT NULL DEFAULT false,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_intl_pathway_modules" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_intl_pathway_modules_code" UNIQUE ("code")
          )
        `);
        await queryRunner.query(
          `CREATE INDEX IF NOT EXISTS "IDX_intl_pathway_modules_sectionId" ON "intl_pathway_modules" ("sectionId")`,
        );
        console.log('✅ intl_pathway_modules created');
      } else {
        for (const col of ['courseId', 'moduleId', 'sectionId'] as const) {
          try {
            await queryRunner.query(`
              ALTER TABLE "intl_pathway_modules"
              ADD COLUMN IF NOT EXISTS "${col}" uuid
            `);
          } catch {
            // ignore
          }
        }
        try {
          await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_intl_pathway_modules_sectionId" ON "intl_pathway_modules" ("sectionId")`,
          );
        } catch {
          // ignore
        }
      }

      const hasRoles = await queryRunner.hasTable('intl_pathway_roles');
      if (!hasRoles) {
        console.log('📋 Creating intl_pathway_roles table...');
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "intl_pathway_roles" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "name" varchar(120) NOT NULL,
            "blurb" text,
            "reqExclude" jsonb,
            "reqAdd" jsonb,
            "reqNote" text,
            "scores" jsonb,
            "sortOrder" int NOT NULL DEFAULT 0,
            "deleted" boolean NOT NULL DEFAULT false,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_intl_pathway_roles" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_intl_pathway_roles_name" UNIQUE ("name")
          )
        `);
        console.log('✅ intl_pathway_roles created');
      }

      const hasProgress = await queryRunner.hasTable('intl_pathway_watch_progress');
      const progressCols = hasProgress
        ? await queryRunner.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'intl_pathway_watch_progress'
        `)
        : [];
      const progressColNames = new Set(
        (Array.isArray(progressCols) ? progressCols : []).map((r: { column_name?: string }) =>
          String(r.column_name || ''),
        ),
      );
      // Legacy shapes: pathway-module UUID as moduleId + moduleCode, or no LMS sectionId.
      const progressNeedsFullRebuild =
        !hasProgress || !progressColNames.has('sectionId') || progressColNames.has('moduleCode');

      if (progressNeedsFullRebuild) {
        if (hasProgress) {
          console.log('📋 Rebuilding intl_pathway_watch_progress (Fort coverage + pathwayCode)…');
          await queryRunner.query(`DROP TABLE IF EXISTS "intl_pathway_watch_progress"`);
        } else {
          console.log('📋 Creating intl_pathway_watch_progress table...');
        }
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "intl_pathway_watch_progress" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "userId" uuid NOT NULL,
            "pathwayCode" varchar(20) NOT NULL,
            "courseId" uuid,
            "moduleId" uuid,
            "sectionId" uuid,
            "lastPositionSeconds" double precision NOT NULL DEFAULT 0,
            "watchedSeconds" integer NOT NULL DEFAULT 0,
            "watchedCoverageRanges" json,
            "durationSeconds" integer NOT NULL DEFAULT 0,
            "videoDurationSeconds" integer NOT NULL DEFAULT 0,
            "remainingSeconds" integer NOT NULL DEFAULT 0,
            "requiredSeconds" integer NOT NULL DEFAULT 0,
            "completionPercent" numeric(5,2) NOT NULL DEFAULT 0,
            "isCompleted" boolean NOT NULL DEFAULT false,
            "sourceVideoUrl" varchar(500),
            "lastAccessedAt" TIMESTAMP NOT NULL DEFAULT now(),
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_intl_pathway_watch_progress" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_intl_pathway_watch_progress_user_code" UNIQUE ("userId", "pathwayCode"),
            CONSTRAINT "FK_intl_pathway_watch_progress_user" FOREIGN KEY ("userId") REFERENCES "international_users"("id") ON DELETE CASCADE
          )
        `);
        await queryRunner.query(
          `CREATE INDEX IF NOT EXISTS "IDX_intl_pathway_watch_progress_userId" ON "intl_pathway_watch_progress" ("userId")`,
        );
        await queryRunner.query(
          `CREATE INDEX IF NOT EXISTS "IDX_intl_pathway_watch_progress_sectionId" ON "intl_pathway_watch_progress" ("sectionId")`,
        );
        await queryRunner.query(
          `CREATE INDEX IF NOT EXISTS "IDX_intl_pathway_watch_progress_pathwayCode" ON "intl_pathway_watch_progress" ("pathwayCode")`,
        );
        console.log('✅ intl_pathway_watch_progress ready (userId + pathwayCode, LMS ids kept)');
      } else {
        // Migrate live DBs: add pathwayCode and switch unique key so each module card has its own row.
        if (!progressColNames.has('pathwayCode')) {
          console.log('📋 Adding pathwayCode to intl_pathway_watch_progress…');
          await queryRunner.query(`
            ALTER TABLE "intl_pathway_watch_progress"
            ADD COLUMN IF NOT EXISTS "pathwayCode" varchar(20)
          `);
          await queryRunner.query(`
            UPDATE "intl_pathway_watch_progress" AS p
            SET "pathwayCode" = m.code
            FROM "intl_pathway_modules" AS m
            WHERE m."sectionId" IS NOT NULL
              AND m."sectionId" = p."sectionId"
              AND m.deleted = false
              AND (p."pathwayCode" IS NULL OR p."pathwayCode" = '')
          `);
          // Drop rows we cannot map to a pathway module (orphan / colliding section ids).
          await queryRunner.query(`
            DELETE FROM "intl_pathway_watch_progress"
            WHERE "pathwayCode" IS NULL OR TRIM("pathwayCode") = ''
          `);
          // Keep newest row per user+code before unique constraint.
          await queryRunner.query(`
            DELETE FROM "intl_pathway_watch_progress" AS p
            USING "intl_pathway_watch_progress" AS d
            WHERE p."userId" = d."userId"
              AND p."pathwayCode" = d."pathwayCode"
              AND p."updatedAt" < d."updatedAt"
          `);
          await queryRunner.query(`
            ALTER TABLE "intl_pathway_watch_progress"
            ALTER COLUMN "pathwayCode" SET NOT NULL
          `);
        }
        try {
          await queryRunner.query(`
            ALTER TABLE "intl_pathway_watch_progress"
            DROP CONSTRAINT IF EXISTS "UQ_intl_pathway_watch_progress_user_course_section"
          `);
        } catch {
          // ignore
        }
        try {
          await queryRunner.query(`
            ALTER TABLE "intl_pathway_watch_progress"
            ADD CONSTRAINT "UQ_intl_pathway_watch_progress_user_code" UNIQUE ("userId", "pathwayCode")
          `);
        } catch {
          // already present
        }
        await queryRunner.query(
          `CREATE INDEX IF NOT EXISTS "IDX_intl_pathway_watch_progress_pathwayCode" ON "intl_pathway_watch_progress" ("pathwayCode")`,
        );
        try {
          await queryRunner.query(`
            ALTER TABLE "intl_pathway_watch_progress"
            ALTER COLUMN "courseId" DROP NOT NULL
          `);
          await queryRunner.query(`
            ALTER TABLE "intl_pathway_watch_progress"
            ALTER COLUMN "moduleId" DROP NOT NULL
          `);
          await queryRunner.query(`
            ALTER TABLE "intl_pathway_watch_progress"
            ALTER COLUMN "sectionId" DROP NOT NULL
          `);
        } catch {
          // already nullable
        }
        try {
          await queryRunner.query(`
            ALTER TABLE "intl_pathway_watch_progress"
            ALTER COLUMN "lastPositionSeconds" TYPE double precision
            USING ROUND("lastPositionSeconds"::numeric, 3)::double precision
          `);
        } catch {
          // already double precision
        }
      }

      const hasCerts = await queryRunner.hasTable('intl_pathway_certificates');
      if (!hasCerts) {
        console.log('📋 Creating intl_pathway_certificates table...');
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "intl_pathway_certificates" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "userId" uuid NOT NULL,
            "planKey" varchar(20) NOT NULL,
            "certificateNo" varchar(80) NOT NULL,
            "pdfUrl" varchar(500),
            "completedAt" TIMESTAMP NOT NULL,
            "status" varchar(20) NOT NULL DEFAULT 'active',
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_intl_pathway_certificates" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_intl_pathway_certificates_user_plan" UNIQUE ("userId", "planKey"),
            CONSTRAINT "UQ_intl_pathway_certificates_no" UNIQUE ("certificateNo")
          )
        `);
        await queryRunner.query(
          `CREATE INDEX IF NOT EXISTS "IDX_intl_pathway_certificates_userId" ON "intl_pathway_certificates" ("userId")`,
        );
        console.log('✅ intl_pathway_certificates created');
      }
    } finally {
      await queryRunner.release();
    }
  }

  private async seedIfEmpty() {
    // Keep seed-on-empty only; force wipe uses POST /intl-pathway/reseed-design
    void shouldSkipRuntimeSchemaInit;

    const moduleCount = await this.moduleRepository.count();
    if (moduleCount === 0) {
      console.log('🌱 Seeding intl pathway modules from design catalog…');
      const rows = INTL_PATHWAY_MODULE_SEED.map((m, index) =>
        this.moduleRepository.create({
          code: m.code,
          title: m.title,
          pillar: m.pillar,
          minutes: m.minutes,
          videoUrl: null,
          bullets: Array.isArray((m as any).bullets) ? [...(m as any).bullets] : [],
          sortOrder: index,
          deleted: false,
        }),
      );
      await this.moduleRepository.save(rows);
      console.log(`✅ Seeded ${rows.length} intl pathway modules`);
    }

    const roleCount = await this.roleRepository.count();
    if (roleCount === 0) {
      console.log('🌱 Seeding intl pathway roles from design catalog…');
      const rows = INTL_PATHWAY_ROLE_SEED.map((r) =>
        this.roleRepository.create({
          name: r.name,
          blurb: r.blurb,
          reqExclude: [...(r.reqExclude || [])],
          reqAdd: [...((r as any).reqAdd || [])],
          reqNote: (r as any).reqNote || null,
          scores: { ...(r.scores || {}) },
          sortOrder: r.sortOrder,
          deleted: false,
        }),
      );
      await this.roleRepository.save(rows);
      console.log(`✅ Seeded ${rows.length} intl pathway roles`);
    }
  }
}
