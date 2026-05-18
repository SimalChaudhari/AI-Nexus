// src/auth/sso-sync.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity, AuthProvider } from '../user/users.entity';
import { OAuthAuthService } from './oauth-auth.service';

/** Optional post-login sync: use IdP access token to pull external data (e.g. events, registrations). */
@Injectable()
export class SsoSyncService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly oauthAuthService: OAuthAuthService,
  ) {}

  /**
   * Sync SSO user data for the given user.
   *
   * Re-fetches the Salesforce custom Apex REST nexus user info using the stored
   * socialAccessToken and refreshes the SCAQ / Associate / account flags on the
   * user row. Safe to call repeatedly; logs and never throws so the caller can
   * decide how to react (callback: non-fatal, POST /sync: return result).
   */
  async syncUserData(userId: string): Promise<{
    synced: boolean;
    details?: string;
    salesforce?: {
      accountId: string | null;
      accountType: string | null;
      memberClass: string | null;
      isSCAQCandidate: boolean | null;
      isAssociateMember: boolean | null;
      syncedAt: Date | null;
    };
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      console.warn('[SSO Sync] User not found for sync:', userId);
      return { synced: false, details: 'User not found' };
    }
    if (user.authProvider !== AuthProvider.OAUTH || !user.socialAccessToken) {
      console.warn('[SSO Sync] User is not SSO or missing social token. Skipping sync.', {
        userId,
        authProvider: user.authProvider,
        hasSocialToken: Boolean(user.socialAccessToken),
      });
      return { synced: false, details: 'User is not SSO or has no social token' };
    }

    console.log('[SSO Sync] Re-fetching Salesforce nexus user info for userId:', userId);
    const nexusInfo = await this.oauthAuthService.fetchSalesforceNexusUserInfo(user.socialAccessToken);
    if (!nexusInfo || typeof nexusInfo !== 'object') {
      console.warn('[SSO Sync] Nexus user info unavailable — flags left unchanged.', { userId });
      return { synced: false, details: 'Salesforce nexus user info unavailable' };
    }

    user.salesforceUsername = nexusInfo.username ?? user.salesforceUsername ?? null;
    user.salesforceMemberClass = nexusInfo.memberClass ?? user.salesforceMemberClass ?? null;
    user.salesforceAccountType = nexusInfo.accountType ?? user.salesforceAccountType ?? null;
    user.salesforceAccountId = nexusInfo.accountID ?? user.salesforceAccountId ?? null;
    user.isSCAQCandidate =
      typeof nexusInfo.isSCAQCandidate === 'boolean' ? nexusInfo.isSCAQCandidate : user.isSCAQCandidate ?? null;
    user.isAssociateMember =
      typeof nexusInfo.isAssociateMember === 'boolean'
        ? nexusInfo.isAssociateMember
        : user.isAssociateMember ?? null;
    user.salesforceUserInfoRaw = nexusInfo as Record<string, unknown>;
    user.salesforceSyncedAt = new Date();

    await this.userRepository.save(user);

    console.log('[SSO Sync] Salesforce nexus flags persisted on user:', {
      userId,
      accountId: user.salesforceAccountId,
      accountType: user.salesforceAccountType,
      memberClass: user.salesforceMemberClass,
      isSCAQCandidate: user.isSCAQCandidate,
      isAssociateMember: user.isAssociateMember,
      syncedAt: user.salesforceSyncedAt,
    });

    return {
      synced: true,
      details: 'Salesforce nexus user info synced',
      salesforce: {
        accountId: user.salesforceAccountId,
        accountType: user.salesforceAccountType,
        memberClass: user.salesforceMemberClass,
        isSCAQCandidate: user.isSCAQCandidate,
        isAssociateMember: user.isAssociateMember,
        syncedAt: user.salesforceSyncedAt,
      },
    };
  }
}
