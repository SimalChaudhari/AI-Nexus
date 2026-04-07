import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AiForumInitService implements OnModuleInit {
    constructor(private dataSource: DataSource) {}

    async onModuleInit() {
        try {
            console.log('🔍 Checking posts, post_comments, post_comment_likes tables...');

            const queryRunner = this.dataSource.createQueryRunner();
            await queryRunner.connect();

            // Create posts table
            const postsExists = await queryRunner.hasTable('posts');
            if (!postsExists) {
                console.log('📋 Creating posts table...');
                await queryRunner.query(`
                    CREATE TABLE IF NOT EXISTS "posts" (
                        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                        "title" varchar NOT NULL,
                        "description" text NOT NULL,
                        "userId" uuid NULL,
                        "viewCount" integer NOT NULL DEFAULT 0,
                        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                        CONSTRAINT "PK_posts" PRIMARY KEY ("id"),
                        CONSTRAINT "FK_posts_user" FOREIGN KEY ("userId") 
                            REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
                    )
                `);
                console.log('✅ AiForumPosts table created successfully');
            } else {
                console.log('✅ AiForumPosts table already exists');
                // Migration: add userId column if missing (optional, for logged-in author)
                const hasUserId = await queryRunner.query(`
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name = 'posts' AND column_name = 'userId'
                `);
                if (!hasUserId?.length) {
                    console.log('📋 Adding userId to posts table...');
                    await queryRunner.query(`
                        ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "userId" uuid NULL;
                        DO $$ BEGIN
                            IF NOT EXISTS (
                                SELECT 1 FROM pg_constraint WHERE conname = 'FK_posts_user'
                            ) THEN
                                ALTER TABLE "posts" ADD CONSTRAINT "FK_posts_user" 
                                    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
                            END IF;
                        END $$;
                    `);
                    console.log('✅ userId column added to posts');
                }
            }

            // Create post_comments table
            const postCommentsExists = await queryRunner.hasTable('post_comments');
            if (!postCommentsExists) {
                console.log('📋 Creating post_comments table...');
                await queryRunner.query(`
                    CREATE TABLE IF NOT EXISTS "post_comments" (
                        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                        "content" text NOT NULL,
                        "postId" uuid NOT NULL,
                        "userId" uuid NOT NULL,
                        "parentCommentId" uuid,
                        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                        CONSTRAINT "PK_post_comments" PRIMARY KEY ("id"),
                        CONSTRAINT "FK_post_comments_post" FOREIGN KEY ("postId") 
                            REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                        CONSTRAINT "FK_post_comments_user" FOREIGN KEY ("userId") 
                            REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                        CONSTRAINT "FK_post_comments_parent" FOREIGN KEY ("parentCommentId") 
                            REFERENCES "post_comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION
                    )
                `);
                console.log('✅ AiForumPost comments table created successfully');
            } else {
                console.log('✅ AiForumPost comments table already exists');
            }

            // Create post_comment_likes table
            const postCommentLikesExists = await queryRunner.hasTable('post_comment_likes');
            if (!postCommentLikesExists) {
                console.log('📋 Creating post_comment_likes table...');
                await queryRunner.query(`
                    CREATE TABLE IF NOT EXISTS "post_comment_likes" (
                        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                        "commentId" uuid NOT NULL,
                        "userId" uuid NOT NULL,
                        CONSTRAINT "PK_post_comment_likes" PRIMARY KEY ("id"),
                        CONSTRAINT "FK_post_comment_likes_comment" FOREIGN KEY ("commentId") 
                            REFERENCES "post_comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                        CONSTRAINT "FK_post_comment_likes_user" FOREIGN KEY ("userId") 
                            REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                        CONSTRAINT "UQ_post_comment_likes_user_comment" UNIQUE ("userId", "commentId")
                    )
                `);
                console.log('✅ AiForumPost comment likes table created successfully');
            } else {
                console.log('✅ AiForumPost comment likes table already exists');
            }

            // Create pinned_posts table
            const pinnedAiForumPostsExists = await queryRunner.hasTable('pinned_posts');
            if (!pinnedAiForumPostsExists) {
                console.log('📋 Creating pinned_posts table...');
                await queryRunner.query(`
                    CREATE TABLE IF NOT EXISTS "pinned_posts" (
                        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                        "userId" uuid NOT NULL,
                        "postId" uuid NOT NULL,
                        "pinnedAt" TIMESTAMP NOT NULL DEFAULT now(),
                        CONSTRAINT "PK_pinned_posts" PRIMARY KEY ("id"),
                        CONSTRAINT "FK_pinned_posts_user" FOREIGN KEY ("userId") 
                            REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                        CONSTRAINT "FK_pinned_posts_post" FOREIGN KEY ("postId") 
                            REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                        CONSTRAINT "UQ_pinned_posts_user_post" UNIQUE ("userId", "postId")
                    )
                `);
                console.log('✅ Pinned posts table created successfully');
            } else {
                console.log('✅ Pinned posts table already exists');
            }

            await queryRunner.release();
        } catch (error) {
            console.error('❌ Error initializing post tables:', error instanceof Error ? error.message : error);
        }
    }
}

