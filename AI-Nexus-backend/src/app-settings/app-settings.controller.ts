import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  Put,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Request, Response } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { RolesGuard } from '../jwt/roles.guard';
import { Roles } from '../jwt/roles.decorator';
import { SessionGuard } from '../jwt/session.guard';
import { UserRole } from '../user/users.entity';
import { AppSettingsService } from './app-settings.service';

const parseEnvPositiveNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const LOGO_LIMIT = parseEnvPositiveNumber(process.env.UPLOAD_IMAGE_MAX_MB, 50) * 1024 * 1024;
const LOGO_TYPE = /^(image\/)(jpeg|png|gif|webp|svg\+xml)$/;

@ApiTags('App Settings')
@Controller('app-settings')
export class AppSettingsController {
  constructor(private readonly appSettingsService: AppSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get public app settings' })
  async getSettings(@Res() response: Response) {
    const settings = await this.appSettingsService.getPublicSettings();

    return response.status(HttpStatus.OK).json({
      data: settings,
    });
  }

  @Get('recommendations/me')
  @UseGuards(SessionGuard, JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get personalized course recommendation ids for current user' })
  async getMyRecommendations(@Res() response: Response, @Req() request: Request) {
    const userId = (request as any).user?.id;
    if (!userId) {
      return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
    }
    const result = await this.appSettingsService.getRecommendationsForUser(userId);
    return response.status(HttpStatus.OK).json({ data: result });
  }

  @Post('logo')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload site logo' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        logo: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: memoryStorage(),
      limits: { fileSize: LOGO_LIMIT },
    })
  )
  async uploadLogo(
    @Res() response: Response,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
        validators: [
          new MaxFileSizeValidator({ maxSize: LOGO_LIMIT }),
          new FileTypeValidator({ fileType: LOGO_TYPE }),
        ],
      })
    )
    file: Express.Multer.File
  ) {
    const result = await this.appSettingsService.uploadLogo(file);

    return response.status(HttpStatus.OK).json(result);
  }

  @Delete('logo')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Remove site logo' })
  async removeLogo(@Res() response: Response) {
    const result = await this.appSettingsService.removeLogo();

    return response.status(HttpStatus.OK).json(result);
  }

  @Post('home-hero')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload home page hero background image' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        hero: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('hero', {
      storage: memoryStorage(),
      limits: { fileSize: LOGO_LIMIT },
    })
  )
  async uploadHomeHero(
    @Res() response: Response,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
        validators: [
          new MaxFileSizeValidator({ maxSize: LOGO_LIMIT }),
          new FileTypeValidator({ fileType: LOGO_TYPE }),
        ],
      })
    )
    file: Express.Multer.File
  ) {
    const result = await this.appSettingsService.uploadHomeHeroImage(file);

    return response.status(HttpStatus.OK).json(result);
  }

  @Delete('home-hero')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Remove home page hero background image (revert to default)' })
  async removeHomeHero(@Res() response: Response) {
    const result = await this.appSettingsService.removeHomeHeroImage();

    return response.status(HttpStatus.OK).json(result);
  }

  @Post('contact-hero')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload contact page hero background image' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        hero: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('hero', {
      storage: memoryStorage(),
      limits: { fileSize: LOGO_LIMIT },
    })
  )
  async uploadContactHero(
    @Res() response: Response,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
        validators: [
          new MaxFileSizeValidator({ maxSize: LOGO_LIMIT }),
          new FileTypeValidator({ fileType: LOGO_TYPE }),
        ],
      })
    )
    file: Express.Multer.File
  ) {
    const result = await this.appSettingsService.uploadContactHeroImage(file);
    return response.status(HttpStatus.OK).json(result);
  }

  @Delete('contact-hero')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Remove contact page hero background image (revert to default)' })
  async removeContactHero(@Res() response: Response) {
    const result = await this.appSettingsService.removeContactHeroImage();
    return response.status(HttpStatus.OK).json(result);
  }

  @Post('course-default-image')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload default course fallback image' })
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
      limits: { fileSize: LOGO_LIMIT },
    })
  )
  async uploadCourseDefaultImage(
    @Res() response: Response,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
        validators: [
          new MaxFileSizeValidator({ maxSize: LOGO_LIMIT }),
          new FileTypeValidator({ fileType: LOGO_TYPE }),
        ],
      })
    )
    file: Express.Multer.File
  ) {
    const result = await this.appSettingsService.uploadCourseDefaultImage(file);
    return response.status(HttpStatus.OK).json(result);
  }

  @Delete('course-default-image')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Remove default course fallback image' })
  async removeCourseDefaultImage(@Res() response: Response) {
    const result = await this.appSettingsService.removeCourseDefaultImage();
    return response.status(HttpStatus.OK).json(result);
  }

  @Put('home-hero-content')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update home page hero text/cta/stats content' })
  async updateHomeHeroContent(@Res() response: Response, @Body() payload: any) {
    const result = await this.appSettingsService.updateHomeHeroContent(payload || {});
    return response.status(HttpStatus.OK).json(result);
  }

  @Put('home-cards-content')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update home page cards section content' })
  async updateHomeCardsContent(@Res() response: Response, @Body() payload: any) {
    const result = await this.appSettingsService.updateHomeCardsContent(payload || {});
    return response.status(HttpStatus.OK).json(result);
  }

  @Put('home-join-content')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update home page join section content' })
  async updateHomeJoinContent(@Res() response: Response, @Body() payload: any) {
    const result = await this.appSettingsService.updateHomeJoinContent(payload || {});
    return response.status(HttpStatus.OK).json(result);
  }

  @Put('contact-hero-content')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update contact page hero text and map content' })
  async updateContactHeroContent(@Res() response: Response, @Body() payload: any) {
    const result = await this.appSettingsService.updateContactHeroContent(payload || {});
    return response.status(HttpStatus.OK).json(result);
  }
}
