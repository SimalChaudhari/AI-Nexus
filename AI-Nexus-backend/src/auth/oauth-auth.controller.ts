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
import { OAuthExchangeDto } from './oauth-auth.dto';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { SsoSyncService } from './sso-sync.service';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('OAuth')
@Controller('auth/oauth')
export class OAuthAuthController {
  constructor(
    private readonly oauthAuthService: OAuthAuthService,
    private readonly ssoSyncService: SsoSyncService,
  ) {}

  @Get('auth-url')
  @ApiOperation({ summary: 'Generate OAuth authorization URL' })
  @ApiQuery({
    name: 'scaqVerify',
    required: false,
    description: 'When true, SCAQ verify-only: non-candidates are not persisted to the database',
  })
  async getAuthUrl(@Query('scaqVerify') scaqVerify?: string) {
    const verify =
      scaqVerify === '1' || scaqVerify === 'true' || scaqVerify === 'yes';
    const { authUrl, state } = this.oauthAuthService.generateAuthUrl({ scaqVerify: verify });
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
  async exchange(@Body() dto: OAuthExchangeDto) {
    const { scaqVerify } = this.oauthAuthService.parseOAuthState(dto.state);
    const tokens = await this.oauthAuthService.exchangeCodeForToken(dto.code);
    const userInfo = await this.oauthAuthService.getUserInfo(tokens.access_token);
    const syncFn = (userId: string) => this.ssoSyncService.syncUserData(userId);
    const resolution = await this.oauthAuthService.resolveOAuthCallback(
      userInfo,
      tokens.access_token,
      { scaqVerify },
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
          isSCAQCandidate: profile.isSCAQCandidate,
          isAssociateMember: profile.isAssociateMember,
        },
      };
    }

    const { user, accessToken, isNewUser } = resolution.result;
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
          username: user.salesforceUsername,
          isSCAQCandidate: user.isSCAQCandidate,
          isAssociateMember: user.isAssociateMember,
          syncedAt: user.salesforceSyncedAt,
        },
      },
      accessToken,
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
      const { scaqVerify } = this.oauthAuthService.parseOAuthState(state);
      const tokens = await this.oauthAuthService.exchangeCodeForToken(code);
      const userInfo = await this.oauthAuthService.getUserInfo(tokens.access_token);
      const syncFn = (userId: string) => this.ssoSyncService.syncUserData(userId);
      const resolution = await this.oauthAuthService.resolveOAuthCallback(
        userInfo,
        tokens.access_token,
        { scaqVerify },
        syncFn,
      );

      if (resolution.mode === 'profile-only') {
        const { profile } = resolution;
        const redirectUrl = this.oauthAuthService.createPostOAuthRedirectUrl(
          this.oauthAuthService.profileOnlyRedirectParams(profile),
        );
        return this.sendRedirectHtml(res, redirectUrl);
      }

      const { user, accessToken, isNewUser } = resolution.result;
    
      const redirectUrl = this.oauthAuthService.createPostOAuthRedirectUrl({
        success: 'true',
        message: 'Logged in successfully',
        accessToken,
        isNewUser: String(isNewUser),
        userId: user.id,
        email: user.email || '',
        firstName: user.firstname,
        lastName: user.lastname,
        salesforceAccountId: user.salesforceAccountId || '',
        salesforceAccountType: user.salesforceAccountType || '',
        salesforceMemberClass: user.salesforceMemberClass || '',
        isSCAQCandidate: user.isSCAQCandidate === null ? '' : String(user.isSCAQCandidate),
        isAssociateMember: user.isAssociateMember === null ? '' : String(user.isAssociateMember),
      });
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
