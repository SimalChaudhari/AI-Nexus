import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { shouldSkipRuntimeSchemaInit } from '../common/schema-init-guard';

@Injectable()
export class CartInitService implements OnModuleInit {
  constructor(private dataSource: DataSource) {}
// complete this service to initialize the user_cart table
  async onModuleInit() {
    if (shouldSkipRuntimeSchemaInit()) {
      return;
    }
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();

      const exists = await queryRunner.hasTable('user_cart');
      if (!exists) {
        await queryRunner.query(`
          CREATE TABLE "user_cart" (
            "userId" uuid NOT NULL,
            "items" jsonb NOT NULL DEFAULT '[]',
            "discount" decimal(12,2) DEFAULT 0,
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_user_cart" PRIMARY KEY ("userId"),
            CONSTRAINT "FK_user_cart_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
          )
        `);
        console.log('✅ user_cart table created successfully');
      } else {
        const hasDiscount = await queryRunner.query(
          `SELECT column_name FROM information_schema.columns WHERE table_name = 'user_cart' AND column_name = 'discount'`
        );
        if (!hasDiscount?.length) {
          await queryRunner.query(`ALTER TABLE "user_cart" ADD COLUMN "discount" decimal(12,2) DEFAULT 0`);
          console.log('✅ user_cart.discount column added');
        }
      }
    } catch (error) {
      console.error(
        '❌ Error initializing user_cart table:',
        error instanceof Error ? error.message : error,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
