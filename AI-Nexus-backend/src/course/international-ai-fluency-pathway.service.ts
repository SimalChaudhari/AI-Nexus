import { Injectable, Optional } from '@nestjs/common';

import { IntlPathwayService } from '../intl-pathway/intl-pathway.service';
import {
  INTL_AI_FLUENCY_PATHWAY_MODULES,
  IntlAiFluencyPathwayModuleDef,
} from './international-ai-fluency-pathway-modules';

export type IntlAiFluencyPathwayModule = IntlAiFluencyPathwayModuleDef & {
  videoUrl: string | null;
  courseId: string | null;
  sectionId: string | null;
  matchedBy: 'admin' | 'title' | 'code' | null;
  bullets?: string[];
};

@Injectable()
export class InternationalAiFluencyPathwayService {
  constructor(@Optional() private readonly intlPathwayService?: IntlPathwayService) {}

  async getPathwayModules(): Promise<IntlAiFluencyPathwayModule[]> {
    if (this.intlPathwayService) {
      try {
        const rows = await this.intlPathwayService.getModulesPublic();
        if (rows.length) {
          return rows.map((row) => ({
            code: row.code,
            title: row.title,
            pillar: row.pillar,
            minutes: row.minutes,
            videoUrl: row.videoUrl ? String(row.videoUrl).trim() : null,
            courseId: null,
            sectionId: null,
            matchedBy: row.videoUrl ? 'admin' : null,
            bullets: Array.isArray(row.bullets) ? row.bullets : [],
          }));
        }
      } catch {
        // fall through to static catalog
      }
    }

    return INTL_AI_FLUENCY_PATHWAY_MODULES.map((module) => ({
      ...module,
      videoUrl: null,
      courseId: null,
      sectionId: null,
      matchedBy: null,
      bullets: [],
    }));
  }
}
