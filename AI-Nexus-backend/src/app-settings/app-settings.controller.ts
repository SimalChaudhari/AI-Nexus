import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseIntPipe,
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
const CEO_VIDEO_LIMIT = parseEnvPositiveNumber(process.env.UPLOAD_VIDEO_MAX_MB, 100) * 1024 * 1024;
const CEO_VIDEO_TYPE = /^(video\/)(mp4|webm|quicktime|x-msvideo|x-matroska)$/;

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

  @Post('home-hero-stat-icon/:index')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload icon/image for a home hero stat (slot 0-3)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        icon: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('icon', {
      storage: memoryStorage(),
      limits: { fileSize: LOGO_LIMIT },
    })
  )
  async uploadHomeHeroStatIcon(
    @Res() response: Response,
    @Param('index', ParseIntPipe) index: number,
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
    const result = await this.appSettingsService.uploadHomeHeroStatIcon(index, file);

    return response.status(HttpStatus.OK).json(result);
  }

  @Post('home-hero-badge-logo')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload logo for home hero eyebrow badge area' })
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
  async uploadHomeHeroBadgeLogo(
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
    const result = await this.appSettingsService.uploadHomeHeroBadgeLogo(file);

    return response.status(HttpStatus.OK).json(result);
  }

  @Delete('home-hero-badge-logo')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Remove home hero badge logo' })
  async removeHomeHeroBadgeLogo(@Res() response: Response) {
    const result = await this.appSettingsService.removeHomeHeroBadgeLogo();

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

  @Post('digital-badge-image')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload digital badge artwork for learner My Badges' })
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
  async uploadDigitalBadgeImage(
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
    const result = await this.appSettingsService.uploadDigitalBadgeImage(file);
    return response.status(HttpStatus.OK).json(result);
  }

  @Delete('digital-badge-image')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Remove digital badge artwork (revert to built-in default)' })
  async removeDigitalBadgeImage(@Res() response: Response) {
    const result = await this.appSettingsService.removeDigitalBadgeImage();
    return response.status(HttpStatus.OK).json(result);
  }

  @Put('digital-badge-settings')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update digital badge issuer and related text settings' })
  async updateDigitalBadgeSettings(@Res() response: Response, @Body() payload: any) {
    const result = await this.appSettingsService.updateDigitalBadgeSettings(payload || {});
    return response.status(HttpStatus.OK).json(result);
  }

  @Get('credential-visibility')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Admin: get global certificate/badge visibility toggles' })
  async getCredentialVisibility(@Res() response: Response) {
    const data = await this.appSettingsService.getCredentialVisibilitySettings();
    return response.status(HttpStatus.OK).json({ data });
  }

  @Put('credential-visibility')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Admin: hide or show all certificates and/or badges for learners' })
  async updateCredentialVisibility(@Res() response: Response, @Body() payload: any) {
    const result = await this.appSettingsService.updateCredentialVisibilitySettings(payload || {});
    return response.status(HttpStatus.OK).json({
      message: result.message,
      data: {
        hideAllCertificates: Boolean(result.settings.hideAllCertificates),
        hideAllBadges: Boolean(result.settings.hideAllBadges),
      },
    });
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

  @Get('faq-content')
  @ApiOperation({ summary: 'Get public FAQs page content' })
  async getFaqContent(@Res() response: Response) {
    const faqContent = await this.appSettingsService.getFaqContent();
    return response.status(HttpStatus.OK).json({ data: faqContent });
  }

  @Put('faq-content')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update public FAQs page content' })
  async updateFaqContent(@Res() response: Response, @Body() payload: any) {
    const result = await this.appSettingsService.updateFaqContent(payload || {});
    return response.status(HttpStatus.OK).json(result);
  }

  @Get('curriculum-content')
  @ApiOperation({ summary: 'Get public home page curriculum content with course modules' })
  async getCurriculumContent(@Res() response: Response) {
    const data = await this.appSettingsService.getCurriculumContent();
    return response.status(HttpStatus.OK).json({ data });
  }

  @Put('curriculum-content')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update public home page curriculum content' })
  async updateCurriculumContent(@Res() response: Response, @Body() payload: any) {
    const result = await this.appSettingsService.updateCurriculumContent(payload || {});
    return response.status(HttpStatus.OK).json(result);
  }

  @Get('programme-fees-content')
  @ApiOperation({ summary: 'Get programme fees & funding content' })
  async getProgrammeFeesContent(@Res() response: Response) {
    const data = await this.appSettingsService.getProgrammeFeesContent();
    return response.status(HttpStatus.OK).json({ data });
  }

  @Put('programme-fees-content')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update programme fees & funding content' })
  async updateProgrammeFeesContent(@Res() response: Response, @Body() payload: any) {
    const result = await this.appSettingsService.updateProgrammeFeesContent(payload || {});
    return response.status(HttpStatus.OK).json(result);
  }

  @Get('membership-payment-settings')
  @ApiOperation({ summary: 'Get membership signup payment amounts, GST, and voucher pricing' })
  async getMembershipPaymentSettings(@Res() response: Response) {
    const data = await this.appSettingsService.getMembershipPaymentSettings();
    return response.status(HttpStatus.OK).json({ data });
  }

  @Put('membership-payment-settings')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update membership signup payment amounts, GST, and voucher pricing' })
  async updateMembershipPaymentSettings(@Res() response: Response, @Body() payload: any) {
    await this.appSettingsService.updateMembershipPaymentSettings(payload || {});
    const data = await this.appSettingsService.getMembershipPaymentSettings();
    return response.status(HttpStatus.OK).json({
      message: 'Membership payment settings updated successfully',
      data,
    });
  }

  @Put('home-testimonials-content')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update home page testimonials section content' })
  async updateHomeTestimonialsContent(@Res() response: Response, @Body() payload: any) {
    const result = await this.appSettingsService.updateHomeTestimonialsContent(payload || {});
    return response.status(HttpStatus.OK).json(result);
  }

  @Post('home-testimonials-avatar/:id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload avatar for a home testimonials card (by id)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: LOGO_LIMIT },
    })
  )
  async uploadHomeTestimonialsAvatar(
    @Res() response: Response,
    @Param('id') id: string,
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
    const result = await this.appSettingsService.uploadHomeTestimonialsAvatar(id, file);
    return response.status(HttpStatus.OK).json(result);
  }

  @Delete('home-testimonials-avatar/:id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Remove avatar for a home testimonials card (by id)' })
  async removeHomeTestimonialsAvatar(
    @Res() response: Response,
    @Param('id') id: string
  ) {
    const result = await this.appSettingsService.removeHomeTestimonialsAvatar(id);
    return response.status(HttpStatus.OK).json(result);
  }

  @Post('home-testimonials-industry-logo/:id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload organisation logo for industry quote (by id)' })
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
  async uploadHomeTestimonialsIndustryLogo(
    @Res() response: Response,
    @Param('id') id: string,
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
    const result = await this.appSettingsService.uploadHomeTestimonialsIndustryLogo(id, file);
    return response.status(HttpStatus.OK).json(result);
  }

  @Delete('home-testimonials-industry-logo/:id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Remove organisation logo for industry quote (by id)' })
  async removeHomeTestimonialsIndustryLogo(
    @Res() response: Response,
    @Param('id') id: string
  ) {
    const result = await this.appSettingsService.removeHomeTestimonialsIndustryLogo(id);
    return response.status(HttpStatus.OK).json(result);
  }

  @Put('home-programme-structure-content')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update home page programme structure timeline content' })
  async updateHomeProgrammeStructureContent(@Res() response: Response, @Body() payload: any) {
    const result = await this.appSettingsService.updateHomeProgrammeStructureContent(payload || {});
    return response.status(HttpStatus.OK).json(result);
  }

  @Post('home-programme-structure-phase-icon/:phaseId')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload icon/image for a programme structure journey phase (by phase id)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        icon: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('icon', {
      storage: memoryStorage(),
      limits: { fileSize: LOGO_LIMIT },
    })
  )
  async uploadHomeProgrammeStructurePhaseIcon(
    @Res() response: Response,
    @Param('phaseId') phaseId: string,
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
    const result = await this.appSettingsService.uploadHomeProgrammeStructurePhaseIcon(
      phaseId,
      file
    );

    return response.status(HttpStatus.OK).json(result);
  }

  @Put('home-funding-eligibility-content')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update home page funding & eligibility section content' })
  async updateHomeFundingEligibilityContent(@Res() response: Response, @Body() payload: any) {
    const result = await this.appSettingsService.updateHomeFundingEligibilityContent(payload || {});
    return response.status(HttpStatus.OK).json(result);
  }

  @Put('home-enrol-options-content')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update home page enrol options section content' })
  async updateHomeEnrolOptionsContent(@Res() response: Response, @Body() payload: any) {
    const result = await this.appSettingsService.updateHomeEnrolOptionsContent(payload || {});
    return response.status(HttpStatus.OK).json(result);
  }

  @Put('home-eligibility-membership-content')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update home page eligibility check & ISCA membership dual-panel section' })
  async updateHomeEligibilityMembershipContent(@Res() response: Response, @Body() payload: any) {
    const result = await this.appSettingsService.updateHomeEligibilityMembershipContent(payload || {});
    return response.status(HttpStatus.OK).json(result);
  }

  @Post('home-eligibility-membership-hero')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload hero image for eligibility & membership section (left panel)' })
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
  async uploadHomeEligibilityMembershipHero(
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
    const result = await this.appSettingsService.uploadHomeEligibilityMembershipHeroImage(file);
    return response.status(HttpStatus.OK).json(result);
  }

  @Delete('home-eligibility-membership-hero')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Remove hero image for eligibility & membership section' })
  async removeHomeEligibilityMembershipHero(@Res() response: Response) {
    const result = await this.appSettingsService.removeHomeEligibilityMembershipHeroImage();
    return response.status(HttpStatus.OK).json(result);
  }

  @Put('home-ceo-launch-content')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update home page CEO launch video section content' })
  async updateHomeCeoLaunchContent(@Res() response: Response, @Body() payload: any) {
    const result = await this.appSettingsService.updateHomeCeoLaunchContent(payload || {});
    return response.status(HttpStatus.OK).json(result);
  }

  @Post('home-ceo-launch-poster')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload CEO launch video poster image' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        poster: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('poster', {
      storage: memoryStorage(),
      limits: { fileSize: LOGO_LIMIT },
    })
  )
  async uploadHomeCeoLaunchPoster(
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
    const result = await this.appSettingsService.uploadHomeCeoLaunchPoster(file);
    return response.status(HttpStatus.OK).json(result);
  }

  @Delete('home-ceo-launch-poster')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Remove CEO launch video poster image' })
  async removeHomeCeoLaunchPoster(@Res() response: Response) {
    const result = await this.appSettingsService.removeHomeCeoLaunchPoster();
    return response.status(HttpStatus.OK).json(result);
  }

  @Post('home-ceo-launch-video')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload CEO launch video file' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        video: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('video', {
      storage: memoryStorage(),
      limits: { fileSize: CEO_VIDEO_LIMIT },
    })
  )
  async uploadHomeCeoLaunchVideo(
    @Res() response: Response,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
        validators: [
          new MaxFileSizeValidator({ maxSize: CEO_VIDEO_LIMIT }),
          new FileTypeValidator({ fileType: CEO_VIDEO_TYPE }),
        ],
      })
    )
    file: Express.Multer.File
  ) {
    const result = await this.appSettingsService.uploadHomeCeoLaunchVideo(file);
    return response.status(HttpStatus.OK).json(result);
  }

  @Delete('home-ceo-launch-video')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Remove uploaded CEO launch video file' })
  async removeHomeCeoLaunchVideo(@Res() response: Response) {
    const result = await this.appSettingsService.removeHomeCeoLaunchVideo();
    return response.status(HttpStatus.OK).json(result);
  }

  @Post('home-ceo-launch-stat-icon/:index')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload icon image for a CEO launch stat card (slot 0-3)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        icon: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('icon', {
      storage: memoryStorage(),
      limits: { fileSize: LOGO_LIMIT },
    })
  )
  async uploadHomeCeoLaunchStatIcon(
    @Res() response: Response,
    @Param('index', ParseIntPipe) index: number,
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
    const result = await this.appSettingsService.uploadHomeCeoLaunchStatIcon(index, file);
    return response.status(HttpStatus.OK).json(result);
  }

  @Delete('home-ceo-launch-stat-icon/:index')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Remove icon image for a CEO launch stat card (slot 0-3)' })
  async removeHomeCeoLaunchStatIcon(
    @Res() response: Response,
    @Param('index', ParseIntPipe) index: number
  ) {
    const result = await this.appSettingsService.removeHomeCeoLaunchStatIcon(index);
    return response.status(HttpStatus.OK).json(result);
  }

  @Put('home-employer-content')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update home page employer section content' })
  async updateHomeEmployerContent(@Res() response: Response, @Body() payload: any) {
    const result = await this.appSettingsService.updateHomeEmployerContent(payload || {});
    return response.status(HttpStatus.OK).json(result);
  }

  @Post('home-employer-hero')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload hero image for employer section on home page' })
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
  async uploadHomeEmployerHero(
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
    const result = await this.appSettingsService.uploadHomeEmployerHeroImage(file);
    return response.status(HttpStatus.OK).json(result);
  }

  @Delete('home-employer-hero')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Remove hero image for employer section on home page' })
  async removeHomeEmployerHero(@Res() response: Response) {
    const result = await this.appSettingsService.removeHomeEmployerHeroImage();
    return response.status(HttpStatus.OK).json(result);
  }

  @Post('home-employer-logo/:index')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload logo for employer section company strip (slot 0-49)' })
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
  async uploadHomeEmployerLogo(
    @Res() response: Response,
    @Param('index', ParseIntPipe) index: number,
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
    const result = await this.appSettingsService.uploadHomeEmployerLogo(index, file);
    return response.status(HttpStatus.OK).json(result);
  }

  @Delete('home-employer-logo/:index')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Remove logo from employer section company strip (slot 0-49)' })
  async removeHomeEmployerLogo(
    @Res() response: Response,
    @Param('index', ParseIntPipe) index: number
  ) {
    const result = await this.appSettingsService.removeHomeEmployerLogo(index);
    return response.status(HttpStatus.OK).json(result);
  }

  @Put('home-employee-content')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update home page employee / learners section content' })
  async updateHomeEmployeeContent(@Res() response: Response, @Body() payload: any) {
    const result = await this.appSettingsService.updateHomeEmployeeContent(payload || {});
    return response.status(HttpStatus.OK).json(result);
  }

  @Post('home-employee-hero')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload hero image for employee section on home page' })
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
  async uploadHomeEmployeeHero(
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
    const result = await this.appSettingsService.uploadHomeEmployeeHeroImage(file);
    return response.status(HttpStatus.OK).json(result);
  }

  @Delete('home-employee-hero')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Remove hero image for employee section on home page' })
  async removeHomeEmployeeHero(@Res() response: Response) {
    const result = await this.appSettingsService.removeHomeEmployeeHeroImage();
    return response.status(HttpStatus.OK).json(result);
  }

  @Post('home-employee-partner-logo/:index')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload partner logo for employee section (by index)' })
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
  async uploadHomeEmployeePartnerLogo(
    @Res() response: Response,
    @Param('index', ParseIntPipe) index: number,
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
    const result = await this.appSettingsService.uploadHomeEmployeePartnerLogo(index, file);
    return response.status(HttpStatus.OK).json(result);
  }

  @Delete('home-employee-partner-logo/:index')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Remove partner logo for employee section (by index)' })
  async removeHomeEmployeePartnerLogo(
    @Res() response: Response,
    @Param('index', ParseIntPipe) index: number
  ) {
    const result = await this.appSettingsService.removeHomeEmployeePartnerLogo(index);
    return response.status(HttpStatus.OK).json(result);
  }

  @Post('programme-fees-agency-logo')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload supporting agency logo for programme fees section' })
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
  async uploadProgrammeFeesAgencyLogo(
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
    const result = await this.appSettingsService.uploadProgrammeFeesAgencyLogo(file);
    return response.status(HttpStatus.OK).json(result);
  }

  @Delete('programme-fees-agency-logo')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Remove supporting agency logo for programme fees section' })
  async removeProgrammeFeesAgencyLogo(@Res() response: Response) {
    const result = await this.appSettingsService.removeProgrammeFeesAgencyLogo();
    return response.status(HttpStatus.OK).json(result);
  }

  @Put('workflow-templates-pitch-content')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update workflows / templates page “Why use AI resources?” intro copy' })
  async updateWorkflowTemplatesPitchContent(@Res() response: Response, @Body() payload: any) {
    const result = await this.appSettingsService.updateWorkflowTemplatesPitchContent(payload || {});
    return response.status(HttpStatus.OK).json(result);
  }

  @Post('workflow-templates-pitch-icon/:slot')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload intro column icon (slot 0, 1, or 2) for workflows templates page' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        icon: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('icon', {
      storage: memoryStorage(),
      limits: { fileSize: LOGO_LIMIT },
    })
  )
  async uploadWorkflowTemplatesPitchIcon(
    @Res() response: Response,
    @Param('slot', ParseIntPipe) slot: number,
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
    const result = await this.appSettingsService.uploadWorkflowTemplatesPitchIcon(slot, file);
    return response.status(HttpStatus.OK).json(result);
  }

  @Delete('workflow-templates-pitch-icon/:slot')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Remove intro column icon (slot 0, 1, or 2) for workflows templates page' })
  async removeWorkflowTemplatesPitchIcon(@Res() response: Response, @Param('slot', ParseIntPipe) slot: number) {
    const result = await this.appSettingsService.removeWorkflowTemplatesPitchIcon(slot);
    return response.status(HttpStatus.OK).json(result);
  }

  @Put('footer-content')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update public site footer content' })
  async updateFooterContent(@Res() response: Response, @Body() payload: any) {
    const result = await this.appSettingsService.updateFooterContent(payload || {});
    return response.status(HttpStatus.OK).json(result);
  }

  @Put('learning-advertise-tab-content')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update Learning page advertise tab (name + link)' })
  async updateLearningAdvertiseTabContent(@Res() response: Response, @Body() payload: any) {
    const result = await this.appSettingsService.updateLearningAdvertiseTabContent(payload || {});
    return response.status(HttpStatus.OK).json(result);
  }

  @Put('partner-with-isca-content')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update Partner with ISCA landing page content' })
  async updatePartnerWithIscaContent(@Res() response: Response, @Body() payload: any) {
    const result = await this.appSettingsService.updatePartnerWithIscaContent(payload || {});
    return response.status(HttpStatus.OK).json(result);
  }

  @Post('partner-with-isca-hero')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload hero image for Partner with ISCA landing page' })
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
  async uploadPartnerWithIscaHero(
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
    const result = await this.appSettingsService.uploadPartnerWithIscaHeroImage(file);
    return response.status(HttpStatus.OK).json(result);
  }

  @Delete('partner-with-isca-hero')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Remove hero image for Partner with ISCA landing page' })
  async removePartnerWithIscaHero(@Res() response: Response) {
    const result = await this.appSettingsService.removePartnerWithIscaHeroImage();
    return response.status(HttpStatus.OK).json(result);
  }

  @Post('partner-with-isca-mockup-image')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload dashboard mockup image for Partner with ISCA landing page' })
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
  async uploadPartnerWithIscaMockupImage(
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
    const result = await this.appSettingsService.uploadPartnerWithIscaMockupImage(file);
    return response.status(HttpStatus.OK).json(result);
  }

  @Delete('partner-with-isca-mockup-image')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Remove dashboard mockup image for Partner with ISCA landing page' })
  async removePartnerWithIscaMockupImage(@Res() response: Response) {
    const result = await this.appSettingsService.removePartnerWithIscaMockupImage();
    return response.status(HttpStatus.OK).json(result);
  }
}
