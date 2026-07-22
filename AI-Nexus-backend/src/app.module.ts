// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/users.module';
import { CategoryModule } from './category/categories.module';
import { ProgramModule } from './program/programs.module';
import { CourseModule } from './course/courses.module';
import { LabelModule } from './label/labels.module';
import { TagModule } from './tag/tags.module';
import { WorkflowModule } from './workflow/workflows.module';
import { AnnouncementModule } from './announcement/announcements.module';
import { NotificationModule } from './notification/notification.module';
import { AiForumModule } from './ai-forum/ai-forum.module';
import { SpeakerModule } from './speaker/speaker.module';
import { LanguageModule } from './language/language.module';
import { ReviewModule } from './review/review.module';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PaymentModule } from './payment/payment.module';
import { AffiliateModule } from './affiliate/affiliate.module';
import { OrderModule } from './order/order.module';
import { CartModule } from './cart/cart.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CorporateModule } from './corporate/corporate.module';
import { AppSettingsModule } from './app-settings/app-settings.module';
import { PromptCatalogModule } from './prompt-catalog/prompt-catalog.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { LlmModule } from './llm/llm.module';
import { DatabaseIndexModule } from './common/database-index.module';

const resolveTypeOrmPoolMax = (): number => {
  const raw = process.env.TYPEORM_POOL_MAX;
  if (raw !== undefined && raw !== '') {
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n) && n >= 1) return Math.min(n, 50);
  }
  // Default pool for long-lived Node (own server / Docker). Many *InitService hooks run onModuleInit
  // in parallel; a single connection would serialize them and slow boot.
  return 10;
};

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseIndexModule,
    LlmModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: (() => {
        const dbUrl = process.env.DATABASE_URL || '';
        if (!dbUrl) {
          console.error('⚠️ DATABASE_URL environment variable is not set!');
          throw new Error('DATABASE_URL is required but not set in environment variables');
        }
        if (process.env.DEBUG_DB === '1') {
          console.log('🔍 DATABASE_URL prefix:', dbUrl.substring(0, 50) + '...');
        }
        // Remove sslmode parameter - we'll handle SSL via TypeORM config
        // Keep pgbouncer=true parameter for Transaction Pooler
        let cleanUrl = dbUrl.replace(/[?&]sslmode=[^&]*/g, '');
        // Clean up trailing ? or & if they exist
        cleanUrl = cleanUrl.replace(/[?&]$/, '');
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
      // Pg pool: override with TYPEORM_POOL_MAX (1–20). Parallel onModuleInit + requests queue less than max:1.
      extra: {
        max: resolveTypeOrmPoolMax(),
        connectionTimeoutMillis: 12_000,
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
      retryAttempts: 3,
      retryDelay: 1000,
    }),
    AuthModule,
    UserModule,
    CategoryModule,
    ProgramModule,
    CourseModule,
    LabelModule,
    TagModule,
    WorkflowModule,
    AnnouncementModule,
    NotificationModule,
    AiForumModule,
    SpeakerModule,
    LanguageModule,
    ReviewModule,
    PaymentModule,
    AffiliateModule,
    OrderModule,
    CartModule,
    DashboardModule,
    CorporateModule,
    AppSettingsModule,
    PromptCatalogModule,
    ChatbotModule,
  ],
  controllers: [AppController],
})
export class AppModule { }

