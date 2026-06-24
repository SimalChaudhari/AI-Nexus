import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OAuthAuthService } from './oauth-auth.service';
import { CreateApplicationNexusDto } from './membership-application-create.dto';
import { CreateApplicationPersonalDetailsDto } from './membership-application-personal.dto';
import { CreateApplicationEmploymentDetailsDto, GetEmploymentPicklistOptionsDto, GetMembershipPicklistOptionsDto } from './membership-application-employment.dto';
import { MEMBERSHIP_PICKLIST_KEYS } from './membership-application/picklists';
import {
  CreateAcademicQualificationDto,
  CreateAtoMembershipDto,
  CreateOpbMembershipDto,
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
import { CreateResidentialDeclarationDto } from './membership-application-residential-declaration.dto';
import { MembershipApplicationSocialTokenDto } from './membership-application-character-declaration.dto';

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

  @Post('picklist-options')
  @ApiOperation({ summary: 'Load membership application Salesforce picklist values' })
  @ApiBody({ type: GetMembershipPicklistOptionsDto })
  async getMembershipPicklistOptions(
    @Res() response: Response,
    @Body() dto: GetMembershipPicklistOptionsDto,
  ) {
    const options = await this.oauthAuthService.getMembershipPicklist(
      dto.socialAccessToken,
      dto.picklistKey,
    );
    return response.status(HttpStatus.OK).json({
      success: true,
      picklistKey: dto.picklistKey,
      options,
    });
  }

  @Post('employment-picklist-options')
  @ApiOperation({
    summary: 'Load membership application picklist values (legacy employment endpoint)',
  })
  @ApiBody({ type: GetEmploymentPicklistOptionsDto })
  async getEmploymentPicklistOptions(
    @Res() response: Response,
    @Body() dto: GetEmploymentPicklistOptionsDto,
  ) {
    const picklistKey =
      dto.picklistKey
      || (dto.field === 'Sector__c'
        ? MEMBERSHIP_PICKLIST_KEYS.industry
        : MEMBERSHIP_PICKLIST_KEYS.companyType);
    const options = await this.oauthAuthService.getMembershipPicklist(
      dto.socialAccessToken,
      picklistKey,
    );
    return response.status(HttpStatus.OK).json({
      success: true,
      picklistKey,
      options,
    });
  }

  @Post('employment-company-type-options')
  @ApiOperation({
    summary:
      'Load CA Work Experience organisation type picklist (Application_Employment_Detail__c.Company_Type__c)',
  })
  @ApiBody({ type: MembershipApplicationSocialTokenDto })
  async getEmploymentCompanyTypeOptions(
    @Res() response: Response,
    @Body() dto: MembershipApplicationSocialTokenDto,
  ) {
    const options = await this.oauthAuthService.getMembershipPicklist(
      dto.socialAccessToken,
      MEMBERSHIP_PICKLIST_KEYS.companyType,
    );
    return response.status(HttpStatus.OK).json({
      success: true,
      picklistKey: MEMBERSHIP_PICKLIST_KEYS.companyType,
      options,
    });
  }

  @Post('organisation-name-options')
  @ApiOperation({ summary: 'Load employment organisation names from Salesforce ApplicationAPI' })
  @ApiBody({ type: MembershipApplicationSocialTokenDto })
  async getOrganisationNameOptions(
    @Res() response: Response,
    @Body() dto: MembershipApplicationSocialTokenDto,
  ) {
    const options = await this.oauthAuthService.getOrganisationNamesForNexus(
      dto.socialAccessToken,
    );
    return response.status(HttpStatus.OK).json({
      success: true,
      options,
    });
  }

  @Post('accountancy-body-name-options')
  @ApiOperation({
    summary: 'Load character reference accountancy body names from Salesforce ApplicationAPI',
  })
  @ApiBody({ type: MembershipApplicationSocialTokenDto })
  async getAccountancyBodyNameOptions(
    @Res() response: Response,
    @Body() dto: MembershipApplicationSocialTokenDto,
  ) {
    const options = await this.oauthAuthService.getAccountancyBodyNamesForNexus(
      dto.socialAccessToken,
    );
    return response.status(HttpStatus.OK).json({
      success: true,
      options,
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
  @ApiOperation({ summary: 'Submit one CA Approved Training Organisation (createATONexus)' })
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

  @Post('opb-membership')
  @ApiOperation({
    summary: 'Submit one other professional body membership record (Experienced pathway)',
  })
  @ApiBody({ type: CreateOpbMembershipDto })
  async createOpbMembership(
    @Res() response: Response,
    @Body() dto: CreateOpbMembershipDto,
  ) {
    const { socialAccessToken, ...rest } = dto;
    const salesforce = await this.oauthAuthService.createMembershipForOPBNexus(
      socialAccessToken,
      rest as Record<string, unknown>,
    );
    return response.status(HttpStatus.OK).json({
      success: true,
      message: 'Other professional body membership submitted successfully.',
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

  @Post('checkout-details')
  @ApiOperation({
    summary:
      'Load checkout / payment summary for billing tab (getCheckoutDetailsForNexus)',
  })
  @ApiBody({ type: GetAvailableDocumentTypesDto })
  async getCheckoutDetails(
    @Res() response: Response,
    @Body() dto: GetAvailableDocumentTypesDto,
  ) {
    const salesforce = await this.oauthAuthService.getCheckoutDetailsForNexus(
      dto.socialAccessToken,
      dto.applicationId,
    );

    const checkoutData =
      salesforce?.data && typeof salesforce.data === 'object' && !Array.isArray(salesforce.data)
        ? (salesforce.data as Record<string, unknown>)
        : {};

    return response.status(HttpStatus.OK).json({
      success: true,
      message:
        (salesforce?.message as string) || 'Checkout details retrieved successfully.',
      checkout: checkoutData,
      salesforce,
    });
  }

  @Post('residential-declaration')
  @ApiOperation({
    summary: 'Submit Residential Declaration tab (createResidentialDeclarationNexus)',
  })
  @ApiBody({ type: CreateResidentialDeclarationDto })
  async createResidentialDeclaration(
    @Res() response: Response,
    @Body() dto: CreateResidentialDeclarationDto,
  ) {
    const { socialAccessToken, ...rest } = dto;
    const salesforce = await this.oauthAuthService.createResidentialDeclarationNexus(
      socialAccessToken,
      rest as Record<string, unknown>,
    );
    return response.status(HttpStatus.OK).json({
      success: true,
      message: 'Residential declaration submitted successfully.',
      salesforce,
    });
  }

  @Post('user-info')
  @ApiOperation({
    summary: 'Load Salesforce nexus user info (userinfonexus) for membership application',
  })
  @ApiBody({ type: MembershipApplicationSocialTokenDto })
  async getUserInfo(
    @Res() response: Response,
    @Body() dto: MembershipApplicationSocialTokenDto,
  ) {
    const nexusInfo = await this.oauthAuthService.fetchMembershipNexusUserInfoForApplication(
      dto.socialAccessToken,
    );
    const memberClass = String(nexusInfo.memberClass || '').trim() || null;
    const membershipStatus = String(nexusInfo.membershipStatus || '').trim() || null;
    return response.status(HttpStatus.OK).json({
      success: true,
      message: 'Membership status loaded.',
      memberClass,
      membershipStatus,
      isCaMember: this.oauthAuthService.isSalesforceCaMemberClass(memberClass),
      isApprovedMember: this.oauthAuthService.isApprovedSalesforceMember(nexusInfo),
      nexusUser: nexusInfo,
    });
  }

  @Post('ca-login')
  @ApiOperation({
    summary:
      'When Salesforce memberClass is CA, sync platform user and return access token for establish-session',
  })
  @ApiBody({ type: MembershipApplicationSocialTokenDto })
  async loginIfCaMember(
    @Res() response: Response,
    @Body() dto: MembershipApplicationSocialTokenDto,
  ) {
    const result = await this.oauthAuthService.resolveCaMemberLoginFromSocialToken(
      dto.socialAccessToken,
    );
    if (!result.isCaMember) {
      return response.status(HttpStatus.OK).json({
        success: true,
        isCaMember: false,
        memberClass: result.memberClass,
        message:
          'Chartered Accountant (CA) membership is not active yet. Continue your application or check back after processing.',
        nexusUser: result.nexusInfo,
      });
    }

    return response.status(HttpStatus.OK).json({
      success: true,
      isCaMember: true,
      memberClass: result.memberClass,
      message: 'CA membership confirmed. Signing you in.',
      accessToken: result.accessToken,
      nexusUser: result.nexusInfo,
    });
  }

  @Post('member-login')
  @ApiOperation({
    summary:
      'When Salesforce memberClass is Member and membershipStatus is Approved, sync platform user and return access token for establish-session',
  })
  @ApiBody({ type: MembershipApplicationSocialTokenDto })
  async loginIfApprovedMember(
    @Res() response: Response,
    @Body() dto: MembershipApplicationSocialTokenDto,
  ) {
    const result = await this.oauthAuthService.resolveApprovedMemberLoginFromSocialToken(
      dto.socialAccessToken,
    );
    const membershipStatus = String(result.membershipStatus || '').trim();

    if (!result.isApprovedMember) {
      return response.status(HttpStatus.OK).json({
        success: true,
        isApprovedMember: false,
        memberClass: result.memberClass,
        membershipStatus,
        message:
          'ISCA Member status is not active yet in eServices. Continue your application or check back after processing.',
        nexusUser: result.nexusInfo,
      });
    }

    return response.status(HttpStatus.OK).json({
      success: true,
      isApprovedMember: true,
      memberClass: result.memberClass,
      membershipStatus,
      message: 'ISCA membership confirmed. Signing you in.',
      accessToken: result.accessToken,
      nexusUser: result.nexusInfo,
    });
  }

  @Post('nric-login')
  @ApiOperation({
    summary: 'When userinfonexus has NRIC_Number, sync platform user and return access token',
  })
  @ApiBody({ type: MembershipApplicationSocialTokenDto })
  async loginIfNricNumberPresent(
    @Res() response: Response,
    @Body() dto: MembershipApplicationSocialTokenDto,
  ) {
    const result = await this.oauthAuthService.resolveNricNumberLoginFromSocialToken(
      dto.socialAccessToken,
    );

    if (!result.hasNricNumber) {
      return response.status(HttpStatus.OK).json({
        success: true,
        hasNricNumber: false,
        loginAllowed: false,
        nricNumber: null,
        message: result.message || 'NRIC_Number was not found in eServices.',
        nexusUser: result.nexusInfo,
      });
    }

    if (!result.loginAllowed) {
      return response.status(HttpStatus.OK).json({
        success: true,
        hasNricNumber: true,
        loginAllowed: false,
        nricNumber: result.nricNumber,
        message: result.message || 'Sign-in is not available for this eServices account.',
        nexusUser: result.nexusInfo,
      });
    }

    return response.status(HttpStatus.OK).json({
      success: true,
      hasNricNumber: true,
      loginAllowed: true,
      nricNumber: result.nricNumber,
      message: result.message || 'NRIC account confirmed. Signing you in.',
      accessToken: result.accessToken,
      nexusUser: result.nexusInfo,
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
