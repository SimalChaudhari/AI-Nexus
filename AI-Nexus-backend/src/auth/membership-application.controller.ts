import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OAuthAuthService } from './oauth-auth.service';
import { CreateApplicationNexusDto } from './membership-application-create.dto';
import { CreateApplicationPersonalDetailsDto } from './membership-application-personal.dto';
import { CreateApplicationEmploymentDetailsDto } from './membership-application-employment.dto';
import {
  CreateAcademicQualificationDto,
  CreateAtoMembershipDto,
  CreateProfessionalQualificationDto,
} from './membership-application-qualification.dto';
import {
  CreateCharacterReferenceDto,
  CreateDeclarationDto,
} from './membership-application-character-declaration.dto';
import {
  GetAvailableDocumentTypesDto,
  UploadMembershipDocumentDto,
} from './membership-application-document.dto';
import { CreateMembershipBillingDto } from './membership-application-billing.dto';

@ApiTags('Membership Application')
@Controller('auth/membership-application')
export class MembershipApplicationController {
  constructor(private readonly oauthAuthService: OAuthAuthService) {}

  @Post('create-application')
  @ApiOperation({
    summary: 'Create Salesforce application record (createApplicationNexus) — run before Personal tab',
  })
  @ApiBody({ type: CreateApplicationNexusDto })
  async createApplication(
    @Res() response: Response,
    @Body() dto: CreateApplicationNexusDto,
  ) {
    const { socialAccessToken, ...rest } = dto;
    const salesforce = await this.oauthAuthService.createApplicationNexus(
      socialAccessToken,
      rest as Record<string, unknown>,
    );

    const applicationId =
      (salesforce?.applicationId as string)
      || (salesforce?.ApplicationId as string)
      || (salesforce?.applicationID as string)
      || '';

    return response.status(HttpStatus.OK).json({
      success: true,
      message: 'Application created successfully.',
      applicationId: applicationId || undefined,
      salesforce,
    });
  }

  @Post('personal-details')
  @ApiOperation({
    summary: 'Submit Personal tab to Salesforce ApplicationAPI (createApplicationPersonalDetailsNexus)',
  })
  @ApiBody({ type: CreateApplicationPersonalDetailsDto })
  async createPersonalDetails(
    @Res() response: Response,
    @Body() dto: CreateApplicationPersonalDetailsDto,
  ) {
    const { socialAccessToken, ...rest } = dto;
    const salesforce = await this.oauthAuthService.createApplicationPersonalDetailsNexus(
      socialAccessToken,
      rest as Record<string, unknown>,
    );

    const applicationId =
      (salesforce?.applicationId as string)
      || (salesforce?.ApplicationId as string)
      || (salesforce?.applicationID as string)
      || dto.applicationId
      || '';

    return response.status(HttpStatus.OK).json({
      success: true,
      message: 'Personal details submitted successfully.',
      applicationId: applicationId || undefined,
      salesforce,
    });
  }

  @Post('employment-details')
  @ApiOperation({
    summary: 'Submit Work Experience tab to Salesforce ApplicationAPI (createEmploymentDetailsNexus)',
  })
  @ApiBody({ type: CreateApplicationEmploymentDetailsDto })
  async createEmploymentDetails(
    @Res() response: Response,
    @Body() dto: CreateApplicationEmploymentDetailsDto,
  ) {
    const { socialAccessToken, ...rest } = dto;
    const salesforce = await this.oauthAuthService.createApplicationEmploymentDetailsNexus(
      socialAccessToken,
      rest as Record<string, unknown>,
    );

    return response.status(HttpStatus.OK).json({
      success: true,
      message: 'Employment details submitted successfully.',
      salesforce,
    });
  }

  @Post('academic-qualification')
  @ApiOperation({ summary: 'Submit one academic qualification record (optional)' })
  @ApiBody({ type: CreateAcademicQualificationDto })
  async createAcademicQualification(
    @Res() response: Response,
    @Body() dto: CreateAcademicQualificationDto,
  ) {
    const { socialAccessToken, ...rest } = dto;
    const salesforce = await this.oauthAuthService.createAcademicQualificationNexus(
      socialAccessToken,
      rest as Record<string, unknown>,
    );
    return response.status(HttpStatus.OK).json({
      success: true,
      message: 'Academic qualification submitted successfully.',
      salesforce,
    });
  }

  @Post('professional-qualification')
  @ApiOperation({ summary: 'Submit one professional qualification record' })
  @ApiBody({ type: CreateProfessionalQualificationDto })
  async createProfessionalQualification(
    @Res() response: Response,
    @Body() dto: CreateProfessionalQualificationDto,
  ) {
    const { socialAccessToken, ...rest } = dto;
    const salesforce = await this.oauthAuthService.createProfessionalQualificationNexus(
      socialAccessToken,
      rest as Record<string, unknown>,
    );
    return response.status(HttpStatus.OK).json({
      success: true,
      message: 'Professional qualification submitted successfully.',
      salesforce,
    });
  }

  @Post('ato-membership')
  @ApiOperation({ summary: 'Submit one other professional body (ATO) membership record' })
  @ApiBody({ type: CreateAtoMembershipDto })
  async createAtoMembership(
    @Res() response: Response,
    @Body() dto: CreateAtoMembershipDto,
  ) {
    const { socialAccessToken, ...rest } = dto;
    const salesforce = await this.oauthAuthService.createATONexus(
      socialAccessToken,
      rest as Record<string, unknown>,
    );
    return response.status(HttpStatus.OK).json({
      success: true,
      message: 'Professional body membership submitted successfully.',
      salesforce,
    });
  }

  @Post('character-reference')
  @ApiOperation({
    summary: 'Submit Character Reference tab (createCharacterReferenceNexus)',
  })
  @ApiBody({ type: CreateCharacterReferenceDto })
  async createCharacterReference(
    @Res() response: Response,
    @Body() dto: CreateCharacterReferenceDto,
  ) {
    const { socialAccessToken, ...rest } = dto;
    const salesforce = await this.oauthAuthService.createCharacterReferenceNexus(
      socialAccessToken,
      rest as Record<string, unknown>,
    );
    return response.status(HttpStatus.OK).json({
      success: true,
      message: 'Character references submitted successfully.',
      salesforce,
    });
  }

  @Post('declaration')
  @ApiOperation({ summary: 'Submit Declaration tab (createDeclarationNexus)' })
  @ApiBody({ type: CreateDeclarationDto })
  async createDeclaration(
    @Res() response: Response,
    @Body() dto: CreateDeclarationDto,
  ) {
    const { socialAccessToken, ...rest } = dto;
    const salesforce = await this.oauthAuthService.createDeclarationNexus(
      socialAccessToken,
      rest as Record<string, unknown>,
    );
    return response.status(HttpStatus.OK).json({
      success: true,
      message: 'Declaration submitted successfully.',
      salesforce,
    });
  }

  @Post('available-document-types')
  @ApiOperation({
    summary:
      'Load required/optional document types for an application (getAvailableDocumentTypesNexus)',
  })
  @ApiBody({ type: GetAvailableDocumentTypesDto })
  async getAvailableDocumentTypes(
    @Res() response: Response,
    @Body() dto: GetAvailableDocumentTypesDto,
  ) {
    const salesforce = await this.oauthAuthService.getAvailableDocumentTypesNexus(
      dto.socialAccessToken,
      dto.applicationId,
    );

    const rawData = salesforce?.data;
    const documentTypes = Array.isArray(rawData) ? rawData : [];

    return response.status(HttpStatus.OK).json({
      success: true,
      message:
        (salesforce?.message as string)
        || 'Available document types retrieved successfully.',
      documentTypes,
      salesforce,
    });
  }

  @Post('upload-document')
  @ApiOperation({ summary: 'Upload one supporting document (uploadDocumentNexus)' })
  @ApiBody({ type: UploadMembershipDocumentDto })
  async uploadDocument(
    @Res() response: Response,
    @Body() dto: UploadMembershipDocumentDto,
  ) {
    const { socialAccessToken, ...rest } = dto;
    const salesforce = await this.oauthAuthService.uploadDocumentNexus(
      socialAccessToken,
      rest as Record<string, unknown>,
    );
    return response.status(HttpStatus.OK).json({
      success: true,
      message: 'Document uploaded successfully.',
      salesforce,
    });
  }

  @Post('billing')
  @ApiOperation({ summary: 'Submit membership application billing (createBillingNexus)' })
  @ApiBody({ type: CreateMembershipBillingDto })
  async createBilling(
    @Res() response: Response,
    @Body() dto: CreateMembershipBillingDto,
  ) {
    const { socialAccessToken, ...rest } = dto;
    const salesforce = await this.oauthAuthService.createBillingNexus(
      socialAccessToken,
      rest as Record<string, unknown>,
    );
    return response.status(HttpStatus.OK).json({
      success: true,
      message: 'Billing submitted successfully.',
      salesforce,
    });
  }
}
