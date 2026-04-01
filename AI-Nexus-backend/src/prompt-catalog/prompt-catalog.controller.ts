import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Put,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { Roles } from '../jwt/roles.decorator';
import { RolesGuard } from '../jwt/roles.guard';
import { SessionGuard } from '../jwt/session.guard';
import { UserRole } from '../user/users.entity';
import {
  CreatePromptCatalogItemDto,
  CreatePromptProviderProfileDto,
  UpdatePromptCatalogItemDto,
  UpdatePromptProviderProfileDto,
} from './prompt-catalog.dto';
import { PromptCatalogService } from './prompt-catalog.service';
import { LocalStorageService } from '../service/local-storage.service';

@ApiTags('Prompt Catalog')
@Controller('prompt-catalog')
export class PromptCatalogController {
  constructor(
    private readonly promptCatalogService: PromptCatalogService,
    private readonly localStorageService: LocalStorageService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get prompt catalog grouped for frontend' })
  async getPublicCatalog(@Res() response: Response) {
    const data = await this.promptCatalogService.getPublicCatalog();
    return response.status(HttpStatus.OK).json({ data });
  }

  @Get('admin')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Admin list prompt catalog rows' })
  async getAdminList(@Res() response: Response) {
    const data = await this.promptCatalogService.getAdminList();
    return response.status(HttpStatus.OK).json({ length: data.length, data });
  }

  @Post()
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Create prompt catalog row' })
  @ApiBody({ type: CreatePromptCatalogItemDto })
  async create(@Body() dto: CreatePromptCatalogItemDto, @Res() response: Response) {
    const result = await this.promptCatalogService.create(dto);
    return response.status(HttpStatus.CREATED).json(result);
  }

  @Put('update/:id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update prompt catalog row' })
  @ApiBody({ type: UpdatePromptCatalogItemDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePromptCatalogItemDto,
    @Res() response: Response
  ) {
    const result = await this.promptCatalogService.update(id, dto);
    return response.status(HttpStatus.OK).json(result);
  }

  @Delete('delete/:id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Delete prompt catalog row' })
  async delete(@Param('id') id: string, @Res() response: Response) {
    const result = await this.promptCatalogService.delete(id);
    return response.status(HttpStatus.OK).json(result);
  }

  @Get('providers/admin')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Admin list provider profiles' })
  async getAdminProviderProfiles(@Res() response: Response) {
    const data = await this.promptCatalogService.getAdminProviderProfiles();
    return response.status(HttpStatus.OK).json({ length: data.length, data });
  }

  @Get('providers/options/admin')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Admin provider options for prompt dropdown' })
  async getAdminProviderOptions(@Res() response: Response) {
    const data = await this.promptCatalogService.getAdminProviderOptions();
    return response.status(HttpStatus.OK).json({ length: data.length, data });
  }

  @Post('providers')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Create provider profile' })
  @ApiBody({ type: CreatePromptProviderProfileDto })
  async createProviderProfile(@Body() dto: CreatePromptProviderProfileDto, @Res() response: Response) {
    const result = await this.promptCatalogService.createProviderProfile(dto);
    return response.status(HttpStatus.CREATED).json(result);
  }

  @Put('providers/update/:id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update provider profile' })
  @ApiBody({ type: UpdatePromptProviderProfileDto })
  async updateProviderProfile(
    @Param('id') id: string,
    @Body() dto: UpdatePromptProviderProfileDto,
    @Res() response: Response
  ) {
    const result = await this.promptCatalogService.updateProviderProfile(id, dto);
    return response.status(HttpStatus.OK).json(result);
  }

  @Delete('providers/delete/:id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Delete provider profile' })
  async deleteProviderProfile(@Param('id') id: string, @Res() response: Response) {
    const result = await this.promptCatalogService.deleteProviderProfile(id);
    return response.status(HttpStatus.OK).json(result);
  }

  @Post('upload-image')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload prompt editor image' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    })
  )
  async uploadPromptImage(
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^(image\/)(jpeg|png|gif|webp|svg\+xml)$/ }),
        ],
      })
    )
    file: Express.Multer.File,
    @Res() response: Response
  ) {
    const url = await this.localStorageService.saveFile(file, 'prompt-catalog');
    return response.status(HttpStatus.OK).json({ url });
  }
}
