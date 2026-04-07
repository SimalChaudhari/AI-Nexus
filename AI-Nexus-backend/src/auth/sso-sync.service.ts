// src/auth/sso-sync.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity, AuthProvider } from '../user/users.entity';

/** Optional post-login sync: use IdP access token to pull external data (e.g. events, registrations). */
@Injectable()
export class SsoSyncService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  /**
   * Sync SSO user data for the given user.
   * Load user, ensure socialAccessToken exists; call external API with Bearer token if needed;
   * create/update local entities and link to user.
   * On failure, log and rethrow so caller can decide (callback: non-fatal, POST /sync: return error).
   */
  async syncUserData(userId: string): Promise<{ synced: boolean; details?: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return { synced: false, details: 'User not found' };
    }
    if (user.authProvider !== AuthProvider.OAUTH || !user.socialAccessToken) {
      return { synced: false, details: 'User is not SSO or has no social token' };
    }
    // Stub: add your external API call here, e.g.:
    // const data = await axios.get(process.env.OAUTH_SYNC_API_URL, { headers: { Authorization: `Bearer ${user.socialAccessToken}` } });
    // then create/update local entities from data and link to user.
    return { synced: true, details: 'No external sync configured' };
  }
}
