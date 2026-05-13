import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Query,
  Put,
  Res,
  UseGuards,
  Post,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PromptCatalogService } from './prompt-catalog.service';
import { PromptAdvanceAssistant } from './utils/prompt-advance-prompts.util';
import { PromptProvider } from './prompt-catalog.entity';
import { UpdatePromptCatalogItemDto } from './prompt-catalog.dto';
import { SessionGuard } from '../jwt/session.guard';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { RolesGuard } from '../jwt/roles.guard';
import { Roles } from '../jwt/roles.decorator';
import { UserRole } from '../user/users.entity';

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

  @Get('provider/:provider')
  @ApiOperation({ summary: 'Get prompt catalog sections for a provider (database)' })
  async getPromptCatalogByProvider(@Param('provider') provider: PromptProvider, @Res() response: Response) {
    const data = await this.promptCatalogService.getProviderPromptDetail(provider);
    return response.status(HttpStatus.OK).json({ data });
  }

  @Get('items')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'List prompt catalog items (paginated; optional provider filter; admin only)' })
  async getPromptCatalogItems(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('provider') provider?: string,
    @Query('categoryKey') categoryKey?: string,
    @Res() response?: Response
  ) {
    const pageParsed = Number.parseInt(String(page ?? '1'), 10);
    const limitParsed = Number.parseInt(String(limit ?? '5'), 10);
    const pageNum = Number.isFinite(pageParsed) && pageParsed > 0 ? pageParsed : 1;
    const limitNum = Number.isFinite(limitParsed) && limitParsed > 0 ? limitParsed : 5;

    const raw = provider?.trim()?.toLowerCase();
    const allowed = new Set<string>(Object.values(PromptProvider));
    const providerFilter =
      raw && allowed.has(raw) ? (raw as PromptProvider) : undefined;

    const rawCategoryKey = categoryKey?.trim();
    const categoryKeyFilter = rawCategoryKey !== undefined && rawCategoryKey !== '' ? rawCategoryKey : undefined;

    const result = await this.promptCatalogService.listAdminPromptItems({
      page: pageNum,
      limit: limitNum,
      search: search?.trim() || '',
      provider: providerFilter,
      categoryKey: categoryKeyFilter,
    });

    return response!.status(HttpStatus.OK).json({
      length: result.data.length,
      data: result.data,
      pagination: result.pagination,
    });
  }

  @Get('admin/category-groups')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'List unique prompt categories (deduped title) with providers, paginated (admin only)',
  })
  async getAdminCategoryGroups(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Res() response?: Response
  ) {
    const pageParsed = Number.parseInt(String(page ?? '1'), 10);
    const limitParsed = Number.parseInt(String(limit ?? '5'), 10);
    const pageNum = Number.isFinite(pageParsed) && pageParsed > 0 ? pageParsed : 1;
    const limitNum = Number.isFinite(limitParsed) && limitParsed > 0 ? limitParsed : 5;

    const result = await this.promptCatalogService.listAdminCategoryGroups({
      page: pageNum,
      limit: limitNum,
      search: search?.trim() || '',
    });

    return response!.status(HttpStatus.OK).json({
      length: result.data.length,
      data: result.data,
      pagination: result.pagination,
    });
  }

  @Put('admin/items/:id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update prompt catalog item' })
  async updateAdminPromptItem(
    @Param('id') id: string,
    @Body() dto: UpdatePromptCatalogItemDto,
    @Res() response: Response
  ) {
    const data = await this.promptCatalogService.updatePromptItem(id, dto);
    return response.status(HttpStatus.OK).json({ data });
  }

  @Get('admin/items/:id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get prompt catalog item by id' })
  async getAdminPromptItemById(@Param('id') id: string, @Res() response: Response) {
    const data = await this.promptCatalogService.getAdminPromptItemById(id);
    return response.status(HttpStatus.OK).json({ data });
  }

  @Delete('admin/items/:id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Delete prompt catalog item' })
  async deleteAdminPromptItem(@Param('id') id: string, @Res() response: Response) {
    const data = await this.promptCatalogService.deletePromptItem(id);
    return response.status(HttpStatus.OK).json(data);
  }

  @Post('admin/sync')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Sync prompt catalog from external source into database' })
  async syncAdminPromptItems(@Res() response: Response) {
    const data = await this.promptCatalogService.syncFromExternalProviders();
    return response.status(HttpStatus.OK).json(data);
  }
}
