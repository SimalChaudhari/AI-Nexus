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
            "sortOrder" int NOT NULL DEFAULT 0,
            "deleted" boolean NOT NULL DEFAULT false,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_intl_pathway_modules" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_intl_pathway_modules_code" UNIQUE ("code")
          )
        `);
        console.log('✅ intl_pathway_modules created');
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
