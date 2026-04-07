import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PromptCatalogService } from './prompt-catalog.service';
import { PromptAdvanceAssistant } from './utils/prompt-advance-prompts.util';

@ApiTags('Prompt Catalog')
@Controller('prompt-catalog')
export class PromptCatalogController {
  constructor(private readonly promptCatalogService: PromptCatalogService) {}

  @Get('external/prompts-json')
  @ApiOperation({ summary: 'Get external Prompt Advance prompts as JSON' })
  async getExternalPromptAdvancePrompts(@Res() response: Response) {
    const data = await this.promptCatalogService.getPromptAdvancePromptsJson();
    return response.status(HttpStatus.OK).json(data);
  }

  @Get('external/prompts-json/:assistant')
  @ApiOperation({ summary: 'Get external Prompt Advance prompts JSON by assistant' })
  async getExternalPromptAdvancePromptsByAssistant(
    @Param('assistant') assistant: PromptAdvanceAssistant,
    @Res() response: Response
  ) {
    const allowedAssistants: PromptAdvanceAssistant[] = ['chatgpt', 'claude', 'gemini'];
    if (!allowedAssistants.includes(assistant)) {
      return response
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: 'Invalid assistant. Allowed values: chatgpt, claude, gemini' });
    }

    const data = await this.promptCatalogService.getPromptAdvanceAssistantPromptsJson(assistant);
    return response.status(HttpStatus.OK).json(data);
  }
}
