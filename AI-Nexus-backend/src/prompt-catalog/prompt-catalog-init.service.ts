import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { shouldSkipRuntimeSchemaInit } from '../common/schema-init-guard';

const DEFAULT_PROVIDER_PROFILES = [
  {
    provider: 'chatgpt',
    title: 'ChatGPT',
    description: 'Finance prompt pack — use Copy or Try it to open ChatGPT with the prompt prefilled.',
    color: 'primary.main',
    bgColor: 'primary.main',
    icon: 'simple-icons:openai',
    detailTitle: 'ChatGPT Prompt Pack',
    redirectUrl: 'https://chatgpt.com/?prompt={prompt}',
  },
  {
    provider: 'gemini',
    title: 'Gemini',
    description:
      'Same finance pack for Gemini — attach sheets, PDFs, or images when useful. Copy or Try it opens Gemini (prompt copied if the app does not accept URL text).',
    color: 'success.main',
    bgColor: 'success.main',
    icon: 'simple-icons:googlegemini',
    detailTitle: 'Gemini Prompt Pack',
    redirectUrl: 'https://gemini.google.com/app?q={prompt}',
  },
  {
    provider: 'claude',
    title: 'Claude',
    description:
      'Same finance pack for Claude — strong for long memos and careful review. Copy or Try it opens Claude with the prompt when supported.',
    color: 'warning.main',
    bgColor: 'warning.main',
    icon: 'simple-icons:anthropic',
    detailTitle: 'Claude Prompt Pack',
    redirectUrl: 'https://www.claude.ai/new?q={prompt}',
  },
];

const ALL_PROVIDERS = ['chatgpt', 'gemini', 'claude'];

const DEFAULT_PROMPT_SECTIONS = [
  {
    title: 'Financial benchmarking and market analysis',
    items: [
      {
        useCase: 'Benchmark financial performance',
        prompt:
          'Benchmark our financial performance against companies in the [insert industry] sector. Use public data to compare gross margin, net profit, and CAC. Present results in a table with source links.',
      },
      {
        useCase: 'Benchmark expense ratios vs. peers',
        prompt:
          "I'm a finance lead at [insert company or industry]. Research current SG&A and R&D expense ratios for 5 comparable companies in the [insert sector, e.g., SaaS, manufacturing, healthcare]. Provide a table with metrics, source links, and a short analysis of how we compare.",
      },
      {
        useCase: 'Competitive fundraising analysis',
        prompt:
          "I'm a CFO preparing for our next fundraising round. Research recent funding rounds (past 12 months) in [insert industry]. Summarize deal sizes, valuations, lead investors, and positioning. Format as a briefing memo with source citations and clear bullet-point insights.",
      },
      {
        useCase: 'Compare global tax regulations',
        prompt:
          'I manage global finance compliance. Research and compare corporate tax rates and reporting requirements in [insert countries]. Focus on tax incentives, reporting thresholds, and penalties. Deliver a comparison chart with links to official sources.',
      },
      {
        useCase: 'ESG finance strategy benchmark',
        prompt:
          "I'm updating our ESG financial strategy. Research how leading companies in [insert industry] integrate ESG into financial planning and disclosures. Summarize 3-5 examples with their KPIs, reporting cadence, and financial impact. Include references.",
      },
    ],
  },
  {
    title: 'Financial planning and forecasting',
    items: [
      {
        useCase: 'Forecast revenue trends',
        prompt:
          "Forecast next quarter's revenue based on the past 6 quarters of data. Use the trends from our [insert dataset or industry] to explain your reasoning. Present the forecast in a table and write a short executive summary.",
      },
      {
        useCase: 'Draft budget assumptions for planning',
        prompt:
          'Help me draft budget assumptions for our next annual plan. Context: [insert department/region/product info]. Output should include key assumptions, rationale, and any dependencies.',
      },
      {
        useCase: 'Model cash flow scenarios',
        prompt:
          'Model 3 cash flow scenarios based on these variables: [insert inputs such as revenue range, delays, or costs]. Output as a table with assumptions, key drivers, and estimated cash impact.',
      },
      {
        useCase: 'Conduct ROI analysis for tooling',
        prompt:
          "Conduct an ROI analysis for a new [insert software or tool] we're considering. Context: [insert usage or pricing data]. Output should include payback period, assumptions, and a short risk assessment.",
      },
      {
        useCase: 'Compare pricing strategies',
        prompt:
          'Compare 3 potential pricing strategies for our [insert product or service]. Use prior pricing data from [insert past year] for context. Output should be a side-by-side comparison table with pros, cons, and estimated impact.',
      },
    ],
  },
  {
    title: 'Financial communication and reporting',
    items: [
      {
        useCase: 'Prepare board meeting talking points',
        prompt:
          'Draft financial talking points for an upcoming board meeting. Use our [insert Q2 results or P&L summary] as input. Write the talking points in bullet format, focusing on topline metrics and risk/upsides.',
      },
      {
        useCase: 'Write investor update summary',
        prompt:
          'Write a summary for our next investor update. Use highlights from [insert performance report or fundraising update]. Format the output as a concise executive email suitable for external stakeholders.',
      },
      {
        useCase: 'Draft QBR financial slide content',
        prompt:
          'Draft the financial performance section for our next QBR deck. Use these inputs: [insert Q2 revenue, margin trends, notable cost changes]. Output as slide bullets with 1-2 takeaway lines.',
      },
      {
        useCase: 'Translate variance analysis',
        prompt:
          'Translate this variance analysis into a manager-friendly summary. Source: [insert analysis]. Write in plain language with a brief explanation of why each variance occurred.',
      },
      {
        useCase: 'Summarize audit findings',
        prompt:
          'Summarize key findings from our internal audit. Use this document: [insert findings]. Output should be a summary for executives, with 3 themes and recommended next steps.',
      },
    ],
  },
  {
    title: 'Operational finance and process improvement',
    items: [
      {
        useCase: 'Analyze cost reduction opportunities',
        prompt:
          'Identify cost reduction opportunities from our recent budget report. Use the breakdown from [insert cost center or department] to evaluate. Provide a table with opportunities, projected savings, and any potential risks.',
      },
      {
        useCase: 'Evaluate M&A target fit',
        prompt:
          'Evaluate the financial and strategic fit of an M&A target. Use this context: [insert company profile or key metrics]. Output should be a table of pros/cons and a 3-paragraph summary of risk/reward.',
      },
      {
        useCase: 'Identify accounting process gaps',
        prompt:
          'Review our current accounting close checklist and suggest improvements. Use this documentation: [insert SOP or task list]. Output should highlight bottlenecks and recommend process updates.',
      },
      {
        useCase: 'Review vendor payments for consolidation',
        prompt:
          'Analyze vendor payments in this data [upload file]. Identify top 10 vendors by spend, spot any duplication (e.g., similar vendor names), and recommend vendors to consolidate. Output a table and short cost-reduction summary.',
      },
      {
        useCase: 'Procurement strategy cost levers',
        prompt:
          "I'm leading a finance initiative to cut procurement costs. Research strategies used by Fortune 500 companies to reduce procurement spend without harming supplier relationships. Present 3-5 tactics with cost impact examples and cited sources.",
      },
    ],
  },
  {
    title: 'Financial dashboards and visual storytelling',
    items: [
      {
        useCase: 'Visualize revenue growth funnel',
        prompt:
          'Create an image of a revenue growth funnel with labeled stages: Acquisition -> Activation -> Revenue -> Retention -> Expansion. Use a clean, modern style suitable for an executive finance presentation. Include icons for each stage.',
      },
      {
        useCase: 'Illustrate budget planning workflow',
        prompt:
          'Create a horizontal process flow diagram showing a budget planning cycle: Forecasting -> Review -> Stakeholder Input -> Approval -> Tracking -> Adjustment. Use corporate-style visuals with subtle color and labels.',
      },
      {
        useCase: 'ESG finance impact visual',
        prompt:
          'Create a visual showing how ESG initiatives can impact finance metrics. Show links between sustainability investments and cost savings, risk mitigation, and investor interest. Use a modern, green-themed design with arrows.',
      },
      {
        useCase: 'Executive dashboard concept',
        prompt:
          'Generate a conceptual image of a finance executive dashboard showing high-level KPIs: Revenue, Gross Margin, Burn Rate, Runway, and Budget vs. Actual. Use a clean layout with panels and placeholder numbers.',
      },
    ],
  },
];

@Injectable()
export class PromptCatalogInitService implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    if (shouldSkipRuntimeSchemaInit()) {
      return;
    }
    try {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      const exists = await queryRunner.hasTable('prompt_catalog_items');
      if (!exists) {
        await queryRunner.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prompt_provider_enum') THEN
              CREATE TYPE "prompt_provider_enum" AS ENUM ('chatgpt', 'gemini', 'claude');
            END IF;
          END
          $$;
        `);

        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "prompt_catalog_items" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "providers" "prompt_provider_enum"[] NOT NULL DEFAULT ARRAY['chatgpt']::prompt_provider_enum[],
            "category" varchar NULL DEFAULT NULL,
            "sectionTitle" varchar NOT NULL,
            "sectionOrder" integer NOT NULL DEFAULT 0,
            "itemOrder" integer NOT NULL DEFAULT 0,
            "useCase" text NOT NULL,
            "prompt" text NOT NULL,
            "isActive" boolean NOT NULL DEFAULT true,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_prompt_catalog_items" PRIMARY KEY ("id")
          )
        `);
      }
      if (exists) {
        const hasProvidersColumn = await queryRunner.hasColumn('prompt_catalog_items', 'providers');
        if (!hasProvidersColumn) {
          await queryRunner.query(
            `ALTER TABLE "prompt_catalog_items" ADD COLUMN "providers" "prompt_provider_enum"[]`
          );
          const hasLegacyProvider = await queryRunner.hasColumn('prompt_catalog_items', 'provider');
          if (hasLegacyProvider) {
            await queryRunner.query(
              `UPDATE "prompt_catalog_items" SET "providers" = ARRAY["provider"]::prompt_provider_enum[] WHERE "providers" IS NULL`
            );
          }
          await queryRunner.query(
            `UPDATE "prompt_catalog_items" SET "providers" = ARRAY['chatgpt']::prompt_provider_enum[] WHERE "providers" IS NULL`
          );
          await queryRunner.query(
            `ALTER TABLE "prompt_catalog_items" ALTER COLUMN "providers" SET NOT NULL`
          );
        }
        const hasLegacyProvider = await queryRunner.hasColumn('prompt_catalog_items', 'provider');
        if (hasLegacyProvider) {
          await queryRunner.query(
            `UPDATE "prompt_catalog_items" SET "provider" = 'chatgpt'::prompt_provider_enum WHERE "provider" IS NULL`
          );
          await queryRunner.query(
            `ALTER TABLE "prompt_catalog_items" ALTER COLUMN "provider" SET DEFAULT 'chatgpt'::prompt_provider_enum`
          );
        }

        const hasPackColumn = await queryRunner.hasColumn('prompt_catalog_items', 'packId');
        const hasCategoryColumn = await queryRunner.hasColumn('prompt_catalog_items', 'category');
        if (hasPackColumn && !hasCategoryColumn) {
          await queryRunner.query(`ALTER TABLE "prompt_catalog_items" RENAME COLUMN "packId" TO "category"`);
        }

        if (hasCategoryColumn || hasPackColumn) {
          await queryRunner.query(`ALTER TABLE "prompt_catalog_items" ALTER COLUMN "category" DROP NOT NULL`);
          await queryRunner.query(`ALTER TABLE "prompt_catalog_items" ALTER COLUMN "category" DROP DEFAULT`);
          await queryRunner.query(
            `UPDATE "prompt_catalog_items" SET "category" = NULL WHERE "category" = '' OR "category" = 'finance'`
          );
        }
      }

      const providerProfilesExists = await queryRunner.hasTable('prompt_provider_profiles');
      if (!providerProfilesExists) {
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "prompt_provider_profiles" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "provider" "prompt_provider_enum" NOT NULL UNIQUE,
            "title" varchar NOT NULL,
            "description" text NOT NULL,
            "color" varchar NOT NULL DEFAULT 'primary.main',
            "bgColor" varchar NOT NULL DEFAULT 'primary.main',
            "icon" varchar NOT NULL,
            "detailTitle" varchar NOT NULL,
            "redirectUrl" varchar NULL DEFAULT NULL,
            "isActive" boolean NOT NULL DEFAULT true,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_prompt_provider_profiles" PRIMARY KEY ("id")
          )
        `);
      }

      const hasPointsColumn = await queryRunner.hasColumn('prompt_provider_profiles', 'points');
      if (hasPointsColumn) {
        await queryRunner.query(`ALTER TABLE "prompt_provider_profiles" DROP COLUMN "points"`);
      }

      const hasBgColorColumn = await queryRunner.hasColumn('prompt_provider_profiles', 'bgColor');
      if (!hasBgColorColumn) {
        await queryRunner.query(
          `ALTER TABLE "prompt_provider_profiles" ADD COLUMN "bgColor" varchar NOT NULL DEFAULT 'primary.main'`
        );
        await queryRunner.query(
          `UPDATE "prompt_provider_profiles" SET "bgColor" = "color" WHERE "bgColor" IS NULL OR "bgColor" = ''`
        );
      }

      const hasRedirectUrlColumn = await queryRunner.hasColumn('prompt_provider_profiles', 'redirectUrl');
      if (!hasRedirectUrlColumn) {
        await queryRunner.query(
          `ALTER TABLE "prompt_provider_profiles" ADD COLUMN "redirectUrl" varchar NULL DEFAULT NULL`
        );
      }

      const providerCountResult = await queryRunner.query(
        `SELECT COUNT(*)::int AS "count" FROM "prompt_provider_profiles"`
      );
      const providerCount = Number(providerCountResult?.[0]?.count || 0);
      if (providerCount === 0) {
        for (const row of DEFAULT_PROVIDER_PROFILES) {
          await queryRunner.query(
            `INSERT INTO "prompt_provider_profiles" ("provider", "title", "description", "color", "bgColor", "icon", "detailTitle", "redirectUrl", "isActive")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
            [row.provider, row.title, row.description, row.color, row.bgColor, row.icon, row.detailTitle, row.redirectUrl]
          );
        }
      }

      const promptCountResult = await queryRunner.query(
        `SELECT COUNT(*)::int AS "count" FROM "prompt_catalog_items"`
      );
      const promptCount = Number(promptCountResult?.[0]?.count || 0);
      if (promptCount === 0) {
        for (let sectionIndex = 0; sectionIndex < DEFAULT_PROMPT_SECTIONS.length; sectionIndex += 1) {
          const section = DEFAULT_PROMPT_SECTIONS[sectionIndex];
          for (let itemIndex = 0; itemIndex < section.items.length; itemIndex += 1) {
            const item = section.items[itemIndex];
            await queryRunner.query(
              `INSERT INTO "prompt_catalog_items"
               ("providers", "category", "sectionTitle", "sectionOrder", "itemOrder", "useCase", "prompt", "isActive")
               VALUES ($1::prompt_provider_enum[], NULL, $2, $3, $4, $5, $6, true)`,
              [ALL_PROVIDERS, section.title, sectionIndex + 1, itemIndex + 1, item.useCase, item.prompt]
            );
          }
        }
      }

      await queryRunner.release();
    } catch (error) {
      console.error(
        'Error initializing prompt_catalog_items table:',
        error instanceof Error ? error.message : error
      );
    }
  }
}
