import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OAuthAuthService } from './oauth-auth.service';
import {
  StudentMembershipApplicationIdDto,
  StudentMembershipApplicationPayloadDto,
  StudentMembershipSubmitDto,
  StudentMembershipUserCheckDto,
} from './student-membership-application.dto';
import { MembershipApplicationSocialTokenDto } from './membership-application-character-declaration.dto';

function parseStudentMembershipSubmitResult(
  salesforce: Record<string, unknown>,
  fallbackApplicationId = '',
) {
  const applicationName = String(
    salesforce['application name']
      ?? salesforce.applicationName
      ?? salesforce.application_name
      ?? '',
  ).trim();
  const applicationStatus = String(
    salesforce['application status']
      ?? salesforce.applicationStatus
      ?? salesforce.application_status
      ?? '',
  ).trim();
  const status = String(salesforce.status ?? salesforce.Status ?? '').trim();
  const message = String(salesforce.message ?? '').trim();
  const applicationId = extractApplicationId(salesforce, fallbackApplicationId);
  const normalizedStatus = status.toLowerCase();
  const normalizedApplicationStatus = applicationStatus.toLowerCase();

  return {
    applicationName,
    applicationStatus,
    applicationId,
    message: message || 'Student membership application submitted.',
    status: status || (normalizedApplicationStatus === 'approved' ? 'Success' : ''),
    isApproved:
      normalizedStatus === 'success'
      || normalizedApplicationStatus === 'approved',
  };
}

function extractApplicationId(
  salesforce: Record<string, unknown>,
  fallback = '',
): string {
  const data = salesforce?.applicationData as Record<string, unknown> | undefined;
  return String(
    salesforce?.applicationId
      || salesforce?.ApplicationId
      || salesforce?.applicationID
      || data?.applicationId
      || fallback
      || '',
  ).trim();
}

function extractApplicationName(salesforce: Record<string, unknown>): string {
  const data = salesforce?.applicationData as Record<string, unknown> | undefined;
  return String(
    salesforce?.applicationName
      || salesforce?.['application name']
      || salesforce?.application_name
      || data?.applicationName
      || data?.['application name']
      || '',
  ).trim();
}

function parseStudentMembershipApplicationResult(
  salesforce: Record<string, unknown>,
  fallbackApplicationId = '',
) {
  const applicationId = extractApplicationId(salesforce, fallbackApplicationId);
  const applicationName = extractApplicationName(salesforce);
  const message = String(salesforce?.message ?? '').trim();
  const success = salesforce?.success !== false;

  return {
    success,
    message: message || 'Application processed successfully.',
    applicationName,
    applicationId,
  };
}

@ApiTags('Student Membership Application')
@Controller('auth/student-membership-application')
export class StudentMembershipApplicationController {
  constructor(private readonly oauthAuthService: OAuthAuthService) {}

  @Post('user-check')
  @ApiOperation({ summary: 'Check whether email/mobile/matriculation already exists (usercheck)' })
  @ApiBody({ type: StudentMembershipUserCheckDto })
  async userCheck(@Res() response: Response, @Body() dto: StudentMembershipUserCheckDto) {
    const { socialAccessToken, email, mobileNumber, matriculationNumber } = dto;
    const salesforce = await this.oauthAuthService.checkStudentMembershipUser(socialAccessToken, {
      ...(email ? { email: String(email).trim() } : {}),
      ...(mobileNumber ? { mobileNumber: String(mobileNumber).trim() } : {}),
      ...(matriculationNumber ? { matriculationNumber: String(matriculationNumber).trim() } : {}),
    });

    return response.status(HttpStatus.OK).json({
      success: true,
      message: (salesforce?.message as string) || 'User check completed.',
      salesforce,
    });
  }

  @Post('create')
  @ApiOperation({ summary: 'Create student membership application (POST application)' })
  @ApiBody({ type: StudentMembershipApplicationPayloadDto })
  async create(@Res() response: Response, @Body() dto: StudentMembershipApplicationPayloadDto) {
    const { socialAccessToken, applicationData } = dto;
    const salesforce = await this.oauthAuthService.createStudentMembershipApplication(
      socialAccessToken,
      applicationData as Record<string, unknown>,
    );

    const result = parseStudentMembershipApplicationResult(
      (salesforce || {}) as Record<string, unknown>,
    );

    return response.status(HttpStatus.OK).json({
      ...result,
      salesforce,
    });
  }

  @Post('update')
  @ApiOperation({ summary: 'Update student membership application (PUT updateapplication/{id})' })
  @ApiBody({ type: StudentMembershipApplicationPayloadDto })
  async update(@Res() response: Response, @Body() dto: StudentMembershipApplicationPayloadDto) {
    const applicationId = String(dto.applicationId || '').trim();
    if (!applicationId) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'applicationId is required.',
      });
    }

    const salesforce = await this.oauthAuthService.updateStudentMembershipApplication(
      dto.socialAccessToken,
      applicationId,
      dto.applicationData as Record<string, unknown>,
    );

    const result = parseStudentMembershipApplicationResult(
      (salesforce || {}) as Record<string, unknown>,
      applicationId,
    );

    return response.status(HttpStatus.OK).json({
      ...result,
      salesforce,
    });
  }

  @Post('submit')
  @ApiOperation({ summary: 'Submit student membership application (PATCH applicationsubmit/{id})' })
  @ApiBody({ type: StudentMembershipSubmitDto })
  async submit(@Res() response: Response, @Body() dto: StudentMembershipSubmitDto) {
    const applicationId = String(dto.applicationId || '').trim();
    if (!applicationId) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'applicationId is required.',
      });
    }

    const salesforce = await this.oauthAuthService.submitStudentMembershipApplication(
      dto.socialAccessToken,
      applicationId,
    );

    const submitResult = parseStudentMembershipSubmitResult(
      (salesforce || {}) as Record<string, unknown>,
      applicationId,
    );

    return response.status(HttpStatus.OK).json({
      success: true,
      ...submitResult,
      salesforce,
    });
  }

  @Post('student-login')
  @ApiOperation({
    summary:
      'When Salesforce memberClass is Student Member, sync platform user and return access token for establish-session',
  })
  @ApiBody({ type: MembershipApplicationSocialTokenDto })
  async loginIfStudentMember(
    @Res() response: Response,
    @Body() dto: MembershipApplicationSocialTokenDto,
  ) {
    const result = await this.oauthAuthService.resolveStudentMemberLoginFromSocialToken(
      dto.socialAccessToken,
    );
    const membershipStatus = String(
      (result.nexusInfo as Record<string, unknown>)?.membershipStatus || '',
    ).trim();

    if (!result.isStudentMember) {
      return response.status(HttpStatus.OK).json({
        success: true,
        isStudentMember: false,
        memberClass: result.memberClass,
        membershipStatus,
        message:
          'ISCA Student Membership is not active yet in eServices. Your membership must be Approved with Student Member class before you can sign in.',
        nexusUser: result.nexusInfo,
      });
    }

    return response.status(HttpStatus.OK).json({
      success: true,
      isStudentMember: true,
      memberClass: result.memberClass,
      membershipStatus,
      message: 'Student membership confirmed. Signing you in.',
      accessToken: result.accessToken,
      nexusUser: result.nexusInfo,
    });
  }

  @Post('details')
  @ApiOperation({ summary: 'Get student membership application details (GET getapplicationdetails/{id})' })
  @ApiBody({ type: StudentMembershipApplicationIdDto })
  async details(@Res() response: Response, @Body() dto: StudentMembershipApplicationIdDto) {
    const salesforce = await this.oauthAuthService.getStudentMembershipApplicationDetails(
      dto.socialAccessToken,
      dto.applicationId,
    );

    const applicationData =
      salesforce?.applicationData && typeof salesforce.applicationData === 'object'
        ? (salesforce.applicationData as Record<string, unknown>)
        : salesforce;

    return response.status(HttpStatus.OK).json({
      success: true,
      message: (salesforce?.message as string) || 'Application retrieved successfully.',
      applicationId: extractApplicationId(salesforce, dto.applicationId),
      applicationData,
      salesforce,
    });
  }
}
