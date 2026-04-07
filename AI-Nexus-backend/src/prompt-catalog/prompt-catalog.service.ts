import { Injectable } from '@nestjs/common';
import {
  fetchPromptAdvancePromptsJson,
  fetchPromptAdvancePromptsJsonByAssistant,
  PromptAdvanceAssistant,
} from './utils/prompt-advance-prompts.util';

@Injectable()
export class PromptCatalogService {
  async getPromptAdvancePromptsJson() {
    return fetchPromptAdvancePromptsJson();
  }

  async getPromptAdvanceAssistantPromptsJson(assistant: PromptAdvanceAssistant) {
    return fetchPromptAdvancePromptsJsonByAssistant(assistant);
  }
}
