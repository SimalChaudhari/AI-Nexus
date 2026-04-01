import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class ReviewInitService implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    try {
      console.log('🔍 Checking reviews table...');
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      const exists = await queryRunner.hasTable('reviews');
      if (!exists) {
        console.log('📋 Creating reviews table...');
        await queryRunner.query(`
          CREATE TABLE "reviews" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "userId" uuid NOT NULL,
            "isSpeaker" boolean NOT NULL DEFAULT false,
            "isCourse" boolean NOT NULL DEFAULT true,
            "courseId" uuid,
            "speakerId" uuid,
            "rating" decimal(3,2) NOT NULL,
            "feedback" text,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_reviews" PRIMARY KEY ("id"),
            CONSTRAINT "FK_reviews_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_reviews_course" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_reviews_speaker" FOREIGN KEY ("speakerId") REFERENCES "speakers"("id") ON DELETE CASCADE
          )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_reviews_userId" ON "reviews" ("userId")`);
        await queryRunner.query(`CREATE INDEX "IDX_reviews_courseId" ON "reviews" ("courseId")`);
        await queryRunner.query(`CREATE INDEX "IDX_reviews_speakerId" ON "reviews" ("speakerId")`);
        console.log('✅ reviews table created successfully');
      } else {
        console.log('✅ reviews table already exists');
        // Migrate spikerId -> speakerId and isSpiker -> isSpeaker if old columns exist
        const hasSpikerIdColumn = await queryRunner.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'reviews' AND column_name = 'spikerId'
        `);
        const hasSpeakerIdColumn = await queryRunner.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'reviews' AND column_name = 'speakerId'
        `);
        if (hasSpikerIdColumn?.length && !hasSpeakerIdColumn?.length) {
          console.log('📋 Migrating reviews: spikerId -> speakerId, isSpiker -> isSpeaker...');
          await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "FK_reviews_spiker"`);
          await queryRunner.query(`ALTER TABLE "reviews" RENAME COLUMN "spikerId" TO "speakerId"`);
          await queryRunner.query(`ALTER TABLE "reviews" RENAME COLUMN "isSpiker" TO "isSpeaker"`);
          await queryRunner.query(`
            ALTER TABLE "reviews" ADD CONSTRAINT "FK_reviews_speaker" FOREIGN KEY ("speakerId") REFERENCES "speakers"("id") ON DELETE CASCADE
          `);
          await queryRunner.query(`DROP INDEX IF EXISTS "IDX_reviews_spikerId"`);
          await queryRunner.query(`CREATE INDEX "IDX_reviews_speakerId" ON "reviews" ("speakerId")`);
          console.log('✅ reviews speaker migration done');
        }
        // Ensure course FK uses CASCADE so review rows are deleted when course is deleted
        try {
          await queryRunner.query(`
            ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "FK_reviews_course"
          `);
          await queryRunner.query(`
            ALTER TABLE "reviews" ADD CONSTRAINT "FK_reviews_course" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE
          `);
          console.log('✅ FK_reviews_course updated to ON DELETE CASCADE');
        } catch (alterErr: unknown) {
          const msg = alterErr instanceof Error ? alterErr.message : String(alterErr);
          console.warn('⚠️ Could not alter FK_reviews_course (may already be CASCADE):', msg);
        }
      }

      await queryRunner.release();
    } catch (error) {
      console.error(
        '❌ Error initializing reviews table:',
        error instanceof Error ? error.message : error,
      );
    }
  }
}
