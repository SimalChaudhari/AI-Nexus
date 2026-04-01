import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class CategoriesInitService implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    try {
      console.log('🔍 Checking categories table...');
      
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      const categoriesExists = await queryRunner.hasTable('categories');
      if (!categoriesExists) {
        console.log('📋 Creating categories table...');
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "categories" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "title" varchar NOT NULL,
            "icon" varchar,
            "status" varchar NOT NULL DEFAULT 'active',
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_categories" PRIMARY KEY ("id")
          )
        `);
        console.log('✅ Categories table created successfully');
      } else {
        console.log('✅ Categories table already exists');
      }

      await queryRunner.release();
    } catch (error) {
      console.error('❌ Error initializing categories table:', error instanceof Error ? error.message : error);
    }
  }
}
