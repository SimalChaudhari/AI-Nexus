import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { shouldSkipRuntimeSchemaInit } from '../common/schema-init-guard';
import { AnnouncementEntity } from './announcements.entity';
import { CommentEntity } from './comments.entity';

@Injectable()
export class AnnouncementsInitService implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    if (shouldSkipRuntimeSchemaInit()) {
      return;
    }
    try {
      console.log('🔍 Checking announcements and comments tables...');
      
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      // Check and create announcements table
      const announcementsExists = await queryRunner.hasTable('announcements');
      if (!announcementsExists) {
        console.log('📋 Creating announcements table...');
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "announcements" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "title" varchar NOT NULL,
            "description" text NOT NULL,
            "viewCount" integer NOT NULL DEFAULT 0,
            "createdById" uuid NULL,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_announcements" PRIMARY KEY ("id"),
            CONSTRAINT "FK_announcements_created_by" FOREIGN KEY ("createdById")
              REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
          )
        `);
        console.log('✅ Announcements table created successfully');
      } else {
        console.log('✅ Announcements table already exists');
        // Migration: add createdById if missing
        const hasCreatedByCol = await queryRunner.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'announcements' AND column_name = 'createdById'
        `);
        if (!hasCreatedByCol || hasCreatedByCol.length === 0) {
          console.log('📋 Adding createdById to announcements table...');
          await queryRunner.query(`
            ALTER TABLE "announcements" ADD COLUMN IF NOT EXISTS "createdById" uuid NULL;
            DO $$ BEGIN
              ALTER TABLE "announcements" ADD CONSTRAINT "FK_announcements_created_by"
              FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL;
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$;
          `);
          console.log('✅ createdById column added');
        }
      }

      // Check and create comments table
      const commentsExists = await queryRunner.hasTable('comments');
      if (!commentsExists) {
        console.log('📋 Creating comments table...');
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "comments" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "content" text NOT NULL,
            "announcementId" uuid NOT NULL,
            "userId" uuid NOT NULL,
            "parentCommentId" uuid,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_comments" PRIMARY KEY ("id"),
            CONSTRAINT "FK_comments_announcement" FOREIGN KEY ("announcementId") 
              REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
            CONSTRAINT "FK_comments_user" FOREIGN KEY ("userId") 
              REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
            CONSTRAINT "FK_comments_parent" FOREIGN KEY ("parentCommentId") 
              REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION
          )
        `);
        console.log('✅ Comments table created successfully');
      } else {
        console.log('✅ Comments table already exists');
        // Migration: add parentCommentId if missing (for existing deployments)
        const hasParentCol = await queryRunner.query(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = 'comments' AND column_name IN ('parentCommentId', 'parentcommentid')
        `);
        if (!hasParentCol || hasParentCol.length === 0) {
          console.log('📋 Adding parentCommentId to comments table...');
          await queryRunner.query(`
            ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "parentCommentId" uuid NULL;
            DO $$ BEGIN
              ALTER TABLE "comments" ADD CONSTRAINT "FK_comments_parent" 
              FOREIGN KEY ("parentCommentId") REFERENCES "comments"("id") ON DELETE CASCADE;
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$;
          `);
          console.log('✅ parentCommentId column added');
        }
      }

      // Check and create comment_likes table
      const commentLikesExists = await queryRunner.hasTable('comment_likes');
      if (!commentLikesExists) {
        console.log('📋 Creating comment_likes table...');
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "comment_likes" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "commentId" uuid NOT NULL,
            "userId" uuid NOT NULL,
            CONSTRAINT "PK_comment_likes" PRIMARY KEY ("id"),
            CONSTRAINT "FK_comment_likes_comment" FOREIGN KEY ("commentId") 
              REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
            CONSTRAINT "FK_comment_likes_user" FOREIGN KEY ("userId") 
              REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
            CONSTRAINT "UQ_comment_likes_user_comment" UNIQUE ("userId", "commentId")
          )
        `);
        console.log('✅ Comment likes table created successfully');
      } else {
        console.log('✅ Comment likes table already exists');
      }

      // Check and create pinned_announcements table
      const pinnedAnnouncementsExists = await queryRunner.hasTable('pinned_announcements');
      if (!pinnedAnnouncementsExists) {
        console.log('📋 Creating pinned_announcements table...');
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "pinned_announcements" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "userId" uuid NOT NULL,
            "announcementId" uuid NOT NULL,
            "pinnedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_pinned_announcements" PRIMARY KEY ("id"),
            CONSTRAINT "FK_pinned_announcements_user" FOREIGN KEY ("userId") 
              REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
            CONSTRAINT "FK_pinned_announcements_announcement" FOREIGN KEY ("announcementId") 
              REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
            CONSTRAINT "UQ_pinned_announcements_user_announcement" UNIQUE ("userId", "announcementId")
          )
        `);
        console.log('✅ Pinned announcements table created successfully');
      } else {
        console.log('✅ Pinned announcements table already exists');
      }

      await queryRunner.release();
    } catch (error) {
      console.error('❌ Error initializing tables:', error instanceof Error ? error.message : error);
      // Don't throw - let the app continue
    }
  }
}
