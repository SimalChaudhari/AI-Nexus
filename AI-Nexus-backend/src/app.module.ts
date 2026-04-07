// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/users.module';
import { CategoryModule } from './category/categories.module';
import { CourseModule } from './course/courses.module';
import { LabelModule } from './label/labels.module';
import { TagModule } from './tag/tags.module';
import { WorkflowModule } from './workflow/workflows.module';
import { AnnouncementModule } from './announcement/announcements.module';
import { AiForumModule } from './ai-forum/ai-forum.module';
import { SpeakerModule } from './speaker/speaker.module';
import { ReviewModule } from './review/review.module';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PaymentModule } from './payment/payment.module';
import { OrderModule } from './order/order.module';
import { CartModule } from './cart/cart.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AppSettingsModule } from './app-settings/app-settings.module';
import { PromptCatalogModule } from './prompt-catalog/prompt-catalog.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // Load environment variables
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: (() => {
        const dbUrl = process.env.DATABASE_URL || '';
        if (!dbUrl) {
          console.error('⚠️ DATABASE_URL environment variable is not set!');
          throw new Error('DATABASE_URL is required but not set in environment variables');
        }
        console.log('🔍 DATABASE_URL found:', dbUrl.substring(0, 50) + '...');
        // Remove sslmode parameter - we'll handle SSL via TypeORM config
        // Keep pgbouncer=true parameter for Transaction Pooler
        let cleanUrl = dbUrl.replace(/[?&]sslmode=[^&]*/g, '');
        // Clean up trailing ? or & if they exist
        cleanUrl = cleanUrl.replace(/[?&]$/, '');
        console.log('🔗 Using connection URL:', cleanUrl.substring(0, 60) + '...');
        return cleanUrl;
      })(),
      autoLoadEntities: true, // Automatically loads all entities (including announcements and comments)
      synchronize: false, // Disabled - using custom initialization service to create tables
      ssl: (() => {
        const dbUrl = process.env.DATABASE_URL || '';
        // If DATABASE_URL is empty, return false (will fail gracefully)
        if (!dbUrl) {
          return false;
        }
        // Local development - disable SSL for localhost
        if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
          return false;
        }
        // Production/Live database (Supabase pooler) - enable SSL with self-signed certificate support
        // This is REQUIRED for Supabase pooler connections
        // rejectUnauthorized: false allows self-signed certificates
        return {
          rejectUnauthorized: false,
        };
      })(),
      // IMPORTANT: max: 1 for PgBouncer Transaction Pooler
      // Vercel serverless = 1 connection per lambda function
      // This prevents "MaxClientsInSessionMode" error
      extra: {
        max: 1, // Critical: Only 1 connection to prevent pool exhaustion
        ssl: (() => {
          const dbUrl = process.env.DATABASE_URL || '';
          if (!dbUrl || dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
            return false;
          }
          // SSL required for Supabase pooler connections
          return {
            rejectUnauthorized: false,
          };
        })(),
      },
      // Add retry logic and better error handling
      retryAttempts: 3,
      retryDelay: 3000,
    }),
    AuthModule,
    UserModule,
    CategoryModule,
    CourseModule,
    LabelModule,
    TagModule,
    WorkflowModule,
    AnnouncementModule,
    AiForumModule,
    SpeakerModule,
    ReviewModule,
    PaymentModule,
    OrderModule,
    CartModule,
    DashboardModule,
    AppSettingsModule,
    PromptCatalogModule,
  ],
  controllers: [AppController],
})
export class AppModule { }

