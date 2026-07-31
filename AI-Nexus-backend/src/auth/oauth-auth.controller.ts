// src/auth/oauth-auth.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  Req,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { OAuthAuthService } from './oauth-auth.service';
import {
  CreateSalesforceNexusUserDto,
  SignupSalesforceForNexusDto,
  CreateCorporateSalesforceAccountAndContactDto,
  CheckCorporateSalesforceAccountDto,
  EndEservicesSessionDto,
  OAuthExchangeDto,
  SalesforceUserCheckEmailDto,
  SalesforceUserCheckNricDto,
  SetSalesforceNexusPasswordDto,
  UpdateSalesforceNexusPaymentDto,
  UpdateSalesforceNexusUserDto,
} from './oauth-auth.dto';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { SsoSyncService } from './sso-sync.service';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthTokenService } from './auth-token.service';

@ApiTags('OAuth')
@Controller('auth/oauth')
export class OAuthAuthController {
  constructor(
    private readonly oauthAuthService: OAuthAuthService,
    private readonly ssoSyncService: SsoSyncService,
    private readonly authTokenService: AuthTokenService,
  ) {}

  @Get('browser-logout-url')
  @ApiOperation({
    summary: 'Salesforce browser logout URL (clears IdP session cookies on sign-out)',
  })
  @ApiQuery({
    name: 'retUrl',
    required: false,
    description: 'Optional post-logout redirect target for Salesforce',
  })
  getBrowserLogoutUrl(@Query('retUrl') retUrl?: string) {
    return {
      browserLogoutUrl: this.oauthAuthService.buildBrowserLogoutUrl(retUrl),
    };
  }

  @Post('end-eservices-session')
  @ApiOperation({
    summary:
      'Revoke eServices OAuth token and clear Salesforce server session when platform login is denied',
  })
  @ApiBody({ type: EndEservicesSessionDto })
  async endEservicesSession(@Body() body: EndEservicesSessionDto) {
    return this.oauthAuthService.endEservicesSession(body?.socialAccessToken);
  }

  @Get('auth-url')
  @ApiOperation({ summary: 'Generate OAuth authorization URL' })
  @ApiQuery({
    name: 'scaqVerify',
    required: false,
    description: 'When true, SCAQ verify-only: non-candidates are not persisted to the database',
  })
  @ApiQuery({
    name: 'loginAsCorporate',
    required: false,
    description: 'When true, SSO resolves/creates the Corporate account row (Org Portal login)',
  })
  async getAuthUrl(
    @Query('scaqVerify') scaqVerify?: string,
    @Query('deferredAuth') deferredAuth?: string,
    @Query('loginAsCorporate') loginAsCorporate?: string,
  ) {
    const verify =
      scaqVerify === '1' || scaqVerify === 'true' || scaqVerify === 'yes';
    const deferred =
      deferredAuth === '1' || deferredAuth === 'true' || deferredAuth === 'yes';
    const corporate =
      loginAsCorporate === '1'
      || loginAsCorporate === 'true'
      || loginAsCorporate === 'yes';
    const { authUrl, state } = this.oauthAuthService.generateAuthUrl({
      scaqVerify: verify,
      deferredAuth: deferred,
      loginAsCorporate: corporate,
    });
    return {
      success: true,
      message: 'OK',
      authUrl,
      state,
    };
  }

  @Post('exchange')
  @ApiOperation({ summary: 'Exchange OAuth authorization code for application token' })
  @ApiBody({ type: OAuthExchangeDto })
  async exchange(
    @Body() dto: OAuthExchangeDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { scaqVerify, deferredAuth, loginAsCorporate } = this.oauthAuthService.parseOAuthState(dto.state);
    const tokens = await this.oauthAuthService.exchangeCodeForToken(dto.code);
    const userInfo = await this.oauthAuthService.getUserInfo(tokens.access_token);
    const syncFn = (userId: string) => this.ssoSyncService.syncUserData(userId);
    const resolution = await this.oauthAuthService.resolveOAuthCallback(
      userInfo,
      tokens.access_token,
      { scaqVerify, loginAsCorporate },
      syncFn,
    );

    if (resolution.mode === 'profile-only') {
      const { profile } = resolution;
      return {
        success: true,
        scaqProfileOnly: true,
        message: 'SCAQ verification complete',
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        salesforce: {
          accountId: profile.salesforceAccountId,
          accountType: profile.salesforceAccountType,
          memberClass: profile.salesforceMemberClass,
          membershipStatus: profile.salesforceMembershipStatus,
          isSCAQCandidate: profile.isSCAQCandidate,
          isAssociateMember: profile.isAssociateMember,
        },
      };
    }

    const { user, isNewUser } = resolution.result;
    const { useDeferredAuth, needsPaidSignup, citizenshipGap } =
      await this.oauthAuthService.resolveOAuthPlatformSessionDeferral(
        user,
        tokens.access_token,
        deferredAuth,
      );
    const { accessToken: platformAccessToken } = await this.authTokenService.issueTokenPair(user, res, {
      deferredAuth: useDeferredAuth,
      req,
    });

    if (!useDeferredAuth) {
      await this.oauthAuthService.markSalesforceAccountAsAiNexusUser(user.salesforceAccountId);
    }

    return {
      success: true,
      message: 'Authentication successful',
      user: {
        id: user.id,
        firstName: user.firstname,
        lastName: user.lastname,
        email: user.email,
        isVerify: user.isVerified,
        role: user.role,
        authProvider: user.authProvider,
        socialId: user.socialId,
        salesforce: {
          accountId: user.salesforceAccountId,
          accountType: user.salesforceAccountType,
          memberClass: user.salesforceMemberClass,
          membershipStatus:
            user.salesforceUserInfoRaw && typeof user.salesforceUserInfoRaw === 'object'
              ? String((user.salesforceUserInfoRaw as Record<string, unknown>).membershipStatus || '').trim()
              || undefined
              : undefined,
          username: user.salesforceUsername,
          isSCAQCandidate: user.isSCAQCandidate,
          isAssociateMember: user.isAssociateMember,
          syncedAt: user.salesforceSyncedAt,
        },
      },
      ...(useDeferredAuth ? { accessToken: platformAccessToken } : {}),
      ...(user.socialAccessToken ? { socialAccessToken: user.socialAccessToken } : {}),
      requiresPaidSignup: needsPaidSignup,
      requiresCitizenshipGap: citizenshipGap,
      isNewUser,
    };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Handle OAuth callback redirect from provider' })
  @ApiQuery({ name: 'code', required: false, description: 'Authorization code returned by provider' })
  @ApiQuery({ name: 'state', required: false, description: 'State returned by provider' })
  @ApiQuery({ name: 'error', required: false, description: 'Provider error message if authentication failed' })
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    const scheme = this.oauthAuthService.deepLinkScheme;



    if (error) {
      const redirectUrl = this.oauthAuthService.createPostOAuthRedirectUrl({
        error: error,
        success: 'false',
      });
      return this.sendRedirectHtml(res, redirectUrl);
    }

    if (!code) {
      const redirectUrl = this.oauthAuthService.createPostOAuthRedirectUrl({
        error: 'Authorization code is missing',
        success: 'false',
      });
      return this.sendRedirectHtml(res, redirectUrl);
    }

    try {
      const { scaqVerify, deferredAuth, loginAsCorporate } = this.oauthAuthService.parseOAuthState(state);
      const tokens = await this.oauthAuthService.exchangeCodeForToken(code);
      const userInfo = await this.oauthAuthService.getUserInfo(tokens.access_token);
      const syncFn = (userId: string) => this.ssoSyncService.syncUserData(userId);
      const resolution = await this.oauthAuthService.resolveOAuthCallback(
        userInfo,
        tokens.access_token,
        { scaqVerify, loginAsCorporate },
        syncFn,
      );

      if (resolution.mode === 'profile-only') {
        const { profile } = resolution;
        const redirectUrl = this.oauthAuthService.createPostOAuthRedirectUrl(
          this.oauthAuthService.profileOnlyRedirectParams(profile),
        );
        return this.sendRedirectHtml(res, redirectUrl);
      }

      const { user, isNewUser } = resolution.result;
      const { useDeferredAuth, needsPaidSignup, citizenshipGap } =
        await this.oauthAuthService.resolveOAuthPlatformSessionDeferral(
          user,
          tokens.access_token,
          deferredAuth,
        );
      const { accessToken: platformAccessToken } = await this.authTokenService.issueTokenPair(user, res, {
        deferredAuth: useDeferredAuth,
      });

      if (!useDeferredAuth) {
        await this.oauthAuthService.markSalesforceAccountAsAiNexusUser(user.salesforceAccountId);
      }

      const redirectParams: Record<string, string> = {
        success: 'true',
        message: 'Logged in successfully',
        isNewUser: String(isNewUser),
        userId: user.id,
        email: user.email || '',
        firstName: user.firstname,
        lastName: user.lastname,
        salesforceAccountId: user.salesforceAccountId || '',
        salesforceAccountType: user.salesforceAccountType || '',
        salesforceMemberClass: user.salesforceMemberClass || '',
        salesforceMembershipStatus:
          user.salesforceUserInfoRaw && typeof user.salesforceUserInfoRaw === 'object'
            ? String((user.salesforceUserInfoRaw as Record<string, unknown>).membershipStatus || '').trim()
            : '',
        isSCAQCandidate: user.isSCAQCandidate === null ? '' : String(user.isSCAQCandidate),
        isAssociateMember: user.isAssociateMember === null ? '' : String(user.isAssociateMember),
        requiresPaidSignup: needsPaidSignup ? 'true' : 'false',
        requiresCitizenshipGap: citizenshipGap ? 'true' : 'false',
        ...(user.socialAccessToken
          ? { socialAccessToken: user.socialAccessToken }
          : {}),
      };

      if (useDeferredAuth) {
        redirectParams.pendingPlatformAccessToken = platformAccessToken;
      }

      const redirectUrl = this.oauthAuthService.createPostOAuthRedirectUrl(redirectParams);
      return this.sendRedirectHtml(res, redirectUrl);
    } catch (err) {
      
      const message =
        err instanceof UnauthorizedException ? err.message : 'Authentication failed. Please try again.';
      const redirectUrl = this.oauthAuthService.createPostOAuthRedirectUrl({
        error: message,
        success: 'false',
      });
      return this.sendRedirectHtml(res, redirectUrl);
    }
  }

  private sendRedirectHtml(res: Response, redirectUrl: string): void {
    const metaUrl = redirectUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    const jsUrl = redirectUrl.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/</g, '\\u003c');
    const linkUrl = redirectUrl.replace(/"/g, '&quot;').replace(/</g, '&lt;');
    res.status(HttpStatus.OK);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${metaUrl}"></head><body><p>Redirecting...</p><script>window.location.href="${jsUrl}";</script><a href="${linkUrl}">Click here if not redirected</a></body></html>`,
    );
  }

  @Post('create-nexus-user')
  @ApiOperation({ summary: 'Create Salesforce membership account via Apex REST (pre-SSO signup)' })
  @ApiBody({ type: CreateSalesforceNexusUserDto })
  async createNexusUser(@Body() dto: CreateSalesforceNexusUserDto) {
    const salesforce = await this.oauthAuthService.createSalesforceNexusUser({
      salutation: dto.salutation,
      first_name: dto.first_name,
      last_name: dto.last_name,
      name_as_per_id: dto.name_as_per_id,
      email: dto.email,
      id_type: dto.id_type,
      id_number: dto.id_number,
      company: dto.company,
      jobFunction: dto.jobFunction,
      countryOfResidence: dto.countryOfResidence,
      noOfYearOfRelevantWorkExperience: dto.noOfYearOfRelevantWorkExperience,
      Is_paid: dto.Is_paid,
      paid_amount: dto.paid_amount,
      Paid_date: dto.Paid_date,
      paymentProofToken: dto.paymentProofToken,
    });
    return {
      success: true,
      message: 'Salesforce membership account created successfully.',
      salesforce,
    };
  }

  @Post('signup-for-nexus')
  @ApiOperation({
    summary:
      'Create Salesforce membership account via signupfornexus (company QR / pre-paid enrollment)',
  })
  @ApiBody({ type: SignupSalesforceForNexusDto })
  async signupForNexus(@Body() dto: SignupSalesforceForNexusDto) {
    const salesforce = await this.oauthAuthService.signupSalesforceForNexus({
      salutation: dto.salutation,
      first_name: dto.first_name,
      last_name: dto.last_name,
      email: dto.email,
      company: dto.company,
      jobFunction: dto.jobFunction,
      countryOfResidence: dto.countryOfResidence,
      companyCode: dto.companyCode,
      noOfYearOfRelevantWorkExperience: dto.noOfYearOfRelevantWorkExperience,
    });
    return {
      success: true,
      message: 'Salesforce membership account created successfully.',
      salesforce,
    };
  }

  @Post('set-nexus-password')
  @ApiOperation({ summary: 'Set Salesforce login password via Apex REST (after createuserfornexus)' })
  @ApiBody({ type: SetSalesforceNexusPasswordDto })
  async setNexusPassword(@Body() dto: SetSalesforceNexusPasswordDto) {
    const salesforce = await this.oauthAuthService.setSalesforceNexusPassword({
      username: dto.username,
      password: dto.password,
    });
    return {
      success: true,
      message: 'Salesforce password set successfully. You can now sign in.',
      salesforce,
    };
  }

  @Post('update-nexus-payment')
  @ApiOperation({
    summary: 'PUT Salesforce nexus-payment/update (Is_Paid / Paid_Amount / Paid_Date)',
  })
  @ApiBody({ type: UpdateSalesforceNexusPaymentDto })
  async updateNexusPayment(@Body() dto: UpdateSalesforceNexusPaymentDto) {
    const salesforce = await this.oauthAuthService.updateSalesforceNexusPayment({
      accountId: dto.accountId,
      Is_Paid: dto.Is_Paid !== false,
      Paid_Amount: dto.Paid_Amount,
      Paid_Date: dto.Paid_Date,
      required: true,
    });
    return {
      success: true,
      message: 'Salesforce payment updated successfully.',
      salesforce,
    };
  }

  @Post('create-corporate-account')
  @ApiOperation({
    summary: 'Create Salesforce corporate account + contact (corporateaccandconcreation)',
  })
  @ApiBody({ type: CreateCorporateSalesforceAccountAndContactDto })
  async createCorporateAccount(@Body() dto: CreateCorporateSalesforceAccountAndContactDto) {
    const salesforce = await this.oauthAuthService.createCorporateSalesforceAccountAndContact({
      account: dto.account as unknown as Record<string, unknown>,
      contact: dto.contact as unknown as Record<string, unknown>,
    });
    return {
      success: true,
      message: 'Corporate Salesforce account created successfully.',
      salesforce,
    };
  }

  @Post('check-corporate-account')
  @ApiOperation({
    summary: 'Check Salesforce corporate account + contact (corporateaccandconcheck)',
  })
  @ApiBody({ type: CheckCorporateSalesforceAccountDto })
  async checkCorporateAccount(@Body() dto: CheckCorporateSalesforceAccountDto) {
    const result = await this.oauthAuthService.checkCorporateSalesforceAccount({
      uenNumber: dto.uenNumber,
      email: dto.email,
    });
    // Preserve success=false when email/UEN do not match exactly.
    return {
      ...result,
      success: result.success !== false,
    };
  }

  @Post('salesforce-user-check-nric')
  @ApiOperation({ summary: 'Check if an eServices account already exists for NRIC (usercheckfornric)' })
  @ApiBody({ type: SalesforceUserCheckNricDto })
  async checkSalesforceUserByNric(@Body() dto: SalesforceUserCheckNricDto) {
    const result = await this.oauthAuthService.checkSalesforceUserByNric(dto.nricNumber);
    return {
      success: true,
      ...result,
    };
  }

  @Post('salesforce-user-check-email')
  @ApiOperation({ summary: 'Check if an eServices account already exists for email (usercheckforemail)' })
  @ApiBody({ type: SalesforceUserCheckEmailDto })
  async checkSalesforceUserByEmail(@Body() dto: SalesforceUserCheckEmailDto) {
    const result = await this.oauthAuthService.checkSalesforceUserByEmail(dto.email);
    return {
      success: true,
      ...result,
    };
  }

  @Post('update-nexus-user')
  @ApiOperation({ summary: 'Update existing eServices account with NRIC/citizenship (userupdateapinexus)' })
  @ApiBody({ type: UpdateSalesforceNexusUserDto })
  async updateNexusUser(@Body() dto: UpdateSalesforceNexusUserDto) {
    const salesforce = await this.oauthAuthService.updateSalesforceNexusUser({
      accountId: dto.accountId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      nationality: dto.nationality,
      nricNumber: dto.nricNumber,
      idType: dto.idType,
    });
    await this.oauthAuthService.markSalesforceAccountAsAiNexusUser(dto.accountId);
    return {
      success: true,
      message: 'Salesforce account updated successfully.',
      salesforce,
    };
  }

  @Post('promote-associate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Promote Salesforce account to Associate member (SCAQ opt-in flow)' })
  async promoteAssociate(@Req() req: Request) {
    const userId = (req as any).user?.id;
    if (!userId) throw new UnauthorizedException('User not found');
    const result = await this.oauthAuthService.promoteUserToAssociateMember(userId);
    return {
      success: result.success,
      message: result.message,
      salesforce: {
        accountId: result.user.salesforceAccountId,
        accountType: result.user.salesforceAccountType,
        memberClass: result.user.salesforceMemberClass,
        isSCAQCandidate: result.user.isSCAQCandidate,
        isAssociateMember: result.user.isAssociateMember,
      },
    };
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Synchronize SSO user data for current user' })
  async sync(@Req() req: Request) {
    const userId = (req as any).user?.id;
    if (!userId) throw new UnauthorizedException('User not found');
    const result = await this.ssoSyncService.syncUserData(userId);
    return {
      success: true,
      message: 'Sync completed',
      ...result,
    };
  }
}
