import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { normalizeEmail } from '../utils/auth.utils';
import { UserEntity, UserRole } from './users.entity';

/**
 * Business rule: same email may exist at most twice in `users`:
 * - 1 Individual (`User`) record
 * - 1 Corporate record
 * A third insert (second User or second Corporate) must be rejected.
 */
export async function assertEmailAvailableForRole(
  userRepository: Repository<UserEntity>,
  email: string,
  role: UserRole,
  options?: { excludeUserId?: string | null },
): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    throw new BadRequestException('Email is required');
  }

  const rows = await userRepository
    .createQueryBuilder('user')
    .where('LOWER(user.email) = LOWER(:email)', { email: normalized })
    .getMany();

  const excludeUserId = String(options?.excludeUserId || '').trim();
  const others = excludeUserId
    ? rows.filter((row) => row.id !== excludeUserId)
    : rows;

  const sameRole = others.find((row) => row.role === role);
  if (sameRole) {
    if (role === UserRole.Corporate) {
      throw new BadRequestException(
        'A corporate account with this email already exists. The same email can only be used once for Corporate.',
      );
    }
    if (role === UserRole.User) {
      throw new BadRequestException(
        'An individual account with this email already exists. The same email can only be used once for User.',
      );
    }
    throw new BadRequestException('Email already exists for this account type.');
  }

  // Safety: never allow more than two rows total for one email (User + Corporate).
  if (others.length >= 2) {
    throw new BadRequestException(
      'This email already has both an individual and a corporate account. A third account is not allowed.',
    );
  }
}
