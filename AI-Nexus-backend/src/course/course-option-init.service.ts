import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CourseOptionType } from './course-option.entity';

const DEFAULT_OPTIONS: Record<CourseOptionType, string[]> = {
  [CourseOptionType.Level]: ['Beginner', 'Intermediate', 'Advanced'],
  [CourseOptionType.Role]: [
    'Accounting / Bookkeeping',
    'Financial Planning & Analysis (FP&A)',
    'Investment Analyst / Portfolio Manager',
    'Banking / Corporate Banking',
    'Risk Management',
    'Audit / Internal Controls',
    'Compliance / Regulatory Reporting',
    'Tax',
    'Treasury',
    'Insurance / Actuarial',
    'Financial Operations',
    'CFO / Finance Leader',
    'FinTech / Product Role',
    'Student / Early Career Finance',
  ],
  [CourseOptionType.AiLevel]: [
    "I'm completely new to AI",
    'I have used tools like ChatGPT',
    'I understand basic AI concepts',
    'I can code or work with data',
    'I already build AI/ML solutions',
  ],
  [CourseOptionType.Goal]: [
    'Understand AI basics',
    'Use AI tools for work',
    'Improve productivity with AI',
    'Learn prompt engineering',
    'Build AI apps or chatbots',
    'Learn machine learning',
    'Learn generative AI',
    'Use AI for data analysis',
    'Manage AI projects or strategy',
    'Understand AI ethics, risk, or governance',
  ],
  [CourseOptionType.UseArea]: [
    'Career growth',
    'Improve current job performance',
    'Build a product',
    'Lead a team',
    'Academic learning',
    'Business transformation',
    'Personal interest',
  ],
};

@Injectable()
export class CourseOptionInitService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CourseOptionInitService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    await this.ensureTable();
    await this.seedDefaults();
  }

  private async ensureTable() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS "course_options" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "type" varchar NOT NULL,
        "label" varchar NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await this.dataSource.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_course_options_type_label_lower"
      ON "course_options" ("type", lower("label"))
    `);
  }

  private async seedDefaults() {
    for (const [type, labels] of Object.entries(DEFAULT_OPTIONS)) {
      for (const label of labels) {
        await this.dataSource.query(
          `
            INSERT INTO "course_options" ("type", "label", "isActive")
            VALUES ($1, $2, true)
            ON CONFLICT DO NOTHING
          `,
          [type, label],
        );
      }
    }
    this.logger.log('Course options defaults ensured');
  }
}

