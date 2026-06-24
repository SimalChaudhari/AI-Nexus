import { describe, expect, it } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import {
  assertNricFinNotAlreadyRegistered,
  isNricFinRegistrationComplete,
} from './nric-registration-guard.util';
import { UserEntity } from '../../user/users.entity';

describe('nric-registration-guard.util', () => {
  const repository = {
    createQueryBuilder: () => ({
      where: () => ({
        getOne: async () => repository._existing,
      }),
    }),
    _existing: null as UserEntity | null,
  };

  it('treats only non-draft users as completed registrations', () => {
    expect(isNricFinRegistrationComplete({ isDraft: true } as UserEntity)).toBe(false);
    expect(isNricFinRegistrationComplete({ isDraft: false } as UserEntity)).toBe(true);
  });

  it('allows NRIC verification while signup is still a draft', async () => {
    repository._existing = {
      id: 'draft-user',
      isDraft: true,
    } as UserEntity;

    await expect(
      assertNricFinNotAlreadyRegistered(repository as never, 'S1234567D', undefined),
    ).resolves.toBeUndefined();
  });

  it('blocks duplicate NRIC after signup draft is finalized', async () => {
    repository._existing = {
      id: 'completed-user',
      isDraft: false,
    } as UserEntity;

    await expect(
      assertNricFinNotAlreadyRegistered(repository as never, 'S1234567D', undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
