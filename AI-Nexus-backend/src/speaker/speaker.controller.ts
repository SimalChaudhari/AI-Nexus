import {
  Controller,
  HttpStatus,
  Param,
  Get,
  Post,
  Delete,
  Put,
  Body,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { SpeakerService } from './speaker.service';
import { CreateSpeakerDto, UpdateSpeakerDto } from './speaker.dto';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { RolesGuard } from '../jwt/roles.guard';
import { Roles } from '../jwt/roles.decorator';
import { SessionGuard } from '../jwt/session.guard';
import { UserRole } from '../user/users.entity';
import { LocalStorageService } from '../service/local-storage.service';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationService } from '../common/pagination/pagination.service';
import { SpeakerPaginatedListResult } from './speaker.service';

const parseEnvPositiveNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const PROFILE_IMAGE_LIMIT = parseEnvPositiveNumber(process.env.UPLOAD_IMAGE_MAX_MB, 50) * 1024 * 1024;
const PROFILE_IMAGE_TYPE = /(jpg|jpeg|png|gif|webp)$/;
const DEFAULT_SPEAKERS_PAGE = 1;
const DEFAULT_SPEAKERS_LIMIT = 10;

@ApiTags('Speakers')
@Controller('speakers')
export class SpeakerController {
  constructor(
    private readonly speakerService: SpeakerService,
    private readonly localStorageService: LocalStorageService,
    private readonly paginationService: PaginationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all speakers' })
  async getAllSpeakers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Res() response?: Response
  ) {
    const hasFilters = Boolean(page || limit || search);
    if (hasFilters) {
      const result = await this.speakerService.getAll({
        usePagination: true,
        page: this.paginationService.parsePositiveInteger(page, DEFAULT_SPEAKERS_PAGE),
        limit: this.paginationService.parsePositiveInteger(limit, DEFAULT_SPEAKERS_LIMIT),
        search: search?.trim() || undefined,
      });
      const paginated = result as SpeakerPaginatedListResult;
      return response!.status(HttpStatus.OK).json({
        length: paginated.data.length,
        data: paginated.data,
        pagination: paginated.pagination,
      });
    }

    const speakers = (await this.speakerService.getAll()) as SpeakerPaginatedListResult['data'];
    return response!.status(HttpStatus.OK).json({
      length: speakers.length,
      data: speakers,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get speaker details by id' })
  async getSpeakerById(@Param('id') id: string, @Res() response: Response) {
    const speaker = await this.speakerService.getById(id);
    return response.status(HttpStatus.OK).json({
      data: speaker,
    });
  }

  @Post()
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a speaker with optional profile image upload' })
  @ApiBody({ type: CreateSpeakerDto })
  @UseInterceptors(
    FileInterceptor('profileimage', {
      storage: memoryStorage(),
      limits: { fileSize: PROFILE_IMAGE_LIMIT },
    }),
  )
  async createSpeaker(
    @Body() createSpeakerDto: CreateSpeakerDto,
    @Res() response: Response,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: PROFILE_IMAGE_LIMIT }),
          new FileTypeValidator({ fileType: PROFILE_IMAGE_TYPE }),
        ],
      }),
    )
    file?: Express.Multer.File,
  ) {
    if (file) {
      const imageUrl = await this.localStorageService.saveFile(file, 'speaker');
      createSpeakerDto.profileimage = imageUrl;
    }
    const result = await this.speakerService.create(createSpeakerDto);
    return response.status(HttpStatus.CREATED).json(result);
  }

  @Put('update/:id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update a speaker and optionally replace profile image' })
  @ApiBody({ type: UpdateSpeakerDto })
  @UseInterceptors(
    FileInterceptor('profileimage', {
      storage: memoryStorage(),
      limits: { fileSize: PROFILE_IMAGE_LIMIT },
    }),
  )
  async updateSpeaker(
    @Param('id') id: string,
    @Body() updateSpeakerDto: UpdateSpeakerDto,
    @Res() response: Response,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: PROFILE_IMAGE_LIMIT }),
          new FileTypeValidator({ fileType: PROFILE_IMAGE_TYPE }),
        ],
      }),
    )
    file?: Express.Multer.File,
  ) {
    const existing = await this.speakerService.getById(id);
    if (file) {
      await this.localStorageService.deleteFileByUrl(existing.profileimage);
      const imageUrl = await this.localStorageService.saveFile(file, 'speaker');
      updateSpeakerDto.profileimage = imageUrl;
    } else if (updateSpeakerDto.profileimage === '') {
      await this.localStorageService.deleteFileByUrl(existing.profileimage);
    }
    const result = await this.speakerService.update(id, updateSpeakerDto);
    return response.status(HttpStatus.OK).json(result);
  }

  @Delete('delete/:id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Delete a speaker' })
  async deleteSpeaker(@Param('id') id: string, @Res() response: Response) {
    const speaker = await this.speakerService.getById(id);
    await this.localStorageService.deleteFileByUrl(speaker.profileimage);
    const result = await this.speakerService.delete(id);
    return response.status(HttpStatus.OK).json(result);
  }
}
