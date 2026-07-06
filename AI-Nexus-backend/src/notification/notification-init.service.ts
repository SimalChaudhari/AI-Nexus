import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { shouldSkipRuntimeSchemaInit } from '../common/schema-init-guard';

@Injectable()
export class NotificationInitService implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    if (shouldSkipRuntimeSchemaInit()) {
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();

      const notificationsExists = await queryRunner.hasTable('notifications');
      if (!notificationsExists) {
        await queryRunner.query(`
          CREATE TABLE "notifications" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "userId" uuid NOT NULL,
            "type" varchar(50) NOT NULL DEFAULT 'announcement',
            "title" varchar(300) NOT NULL,
            "body" text,
            "link" varchar(500),
            "referenceId" uuid,
            "isRead" boolean NOT NULL DEFAULT false,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
            CONSTRAINT "FK_notifications_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
          )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_notifications_userId" ON "notifications" ("userId")`);
        await queryRunner.query(`CREATE INDEX "IDX_notifications_isRead" ON "notifications" ("isRead")`);
        await queryRunner.query(
          `CREATE INDEX "IDX_notifications_userId_createdAt" ON "notifications" ("userId", "createdAt" DESC)`,
        );
        console.log('✅ notifications table created successfully');
      }

      const pushExists = await queryRunner.hasTable('push_subscriptions');
      if (!pushExists) {
        await queryRunner.query(`
          CREATE TABLE "push_subscriptions" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "userId" uuid NOT NULL,
            "endpoint" text NOT NULL,
            "p256dh" varchar(255) NOT NULL,
            "auth" varchar(255) NOT NULL,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_push_subscriptions" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_push_subscriptions_endpoint" UNIQUE ("endpoint"),
            CONSTRAINT "FK_push_subscriptions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
          )
        `);
        await queryRunner.query(
          `CREATE INDEX "IDX_push_subscriptions_userId" ON "push_subscriptions" ("userId")`,
        );
        console.log('✅ push_subscriptions table created successfully');
      }
    } catch (error) {
      console.error(
        '❌ Error initializing notification tables:',
        error instanceof Error ? error.message : error,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
