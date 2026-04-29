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
        return;
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
