import { BadRequestException } from '@nestjs/common';

import { Repository } from 'typeorm';

import { UserEntity } from '../../user/users.entity';

import { maskSingaporeNricFin, normalizeSingaporeNricFin } from './singapore-nric-fin.util';



export const NRIC_ALREADY_REGISTERED_MESSAGE =

  'This NRIC/FIN number is already registered. Please sign in with your existing account.';



export function resolveStoredNricFin(user: UserEntity | null | undefined): string {

  if (!user) return '';



  const snapshot =

    user.eligibilitySnapshot && typeof user.eligibilitySnapshot === 'object'

      ? user.eligibilitySnapshot

      : {};

  const audit =

    snapshot.nricAudit && typeof snapshot.nricAudit === 'object'

      ? (snapshot.nricAudit as Record<string, unknown>)

      : {};



  return normalizeSingaporeNricFin(

    String(

      user.nricFinCanonicalValue

      || audit.identifier

      || snapshot.verifiedNricFin

      || '',

    ),

  );

}



/** Completed membership — only when signup draft has been finalized (`isDraft = false`). */

export function isNricFinRegistrationComplete(user: UserEntity | null | undefined): boolean {

  if (!user) return false;

  return !user.isDraft;

}



/** Whether an existing DB row can be updated for the current NRIC verification attempt. */

export function canReuseUserForNricVerification(

  user: UserEntity | null | undefined,

  normalizedNricFin?: string,

): boolean {

  if (!user) return false;

  if (!user.isDraft) return false;



  const storedNric = resolveStoredNricFin(user);

  const nextNric = normalizeSingaporeNricFin(normalizedNricFin || '');

  if (storedNric && nextNric && storedNric !== nextNric) {

    return false;

  }



  return true;

}



export async function findUserByVerifiedNricFin(

  userRepository: Repository<UserEntity>,

  normalizedNricFin: string,

): Promise<UserEntity | null> {

  const normalized = normalizeSingaporeNricFin(normalizedNricFin);

  if (!normalized) return null;



  return userRepository

    .createQueryBuilder('usr')

    .where(

      `(

        usr."nricFinCanonicalValue" = :nric

        OR usr."eligibilitySnapshot"->>'verifiedNricFin' = :nric

        OR usr."eligibilitySnapshot"->'nricAudit'->>'identifier' = :nric

      )`,

      { nric: normalized },

    )

    .getOne();

}



export async function assertNricFinNotAlreadyRegistered(

  userRepository: Repository<UserEntity>,

  normalizedNricFin: string,

  _currentUserId?: string,

): Promise<void> {

  const existing = await findUserByVerifiedNricFin(userRepository, normalizedNricFin);

  if (!existing) return;



  // In-progress signup drafts may re-verify the same NRIC without blocking.

  if (existing.isDraft) {

    return;

  }



  throw new BadRequestException(NRIC_ALREADY_REGISTERED_MESSAGE);

}



/** Block Salesforce account creation when this NRIC is on a finalized registration. */

export async function assertNricFinAvailableForAccountCreation(

  userRepository: Repository<UserEntity>,

  normalizedNricFin: string,

  _currentUserId?: string,

): Promise<void> {

  const normalized = normalizeSingaporeNricFin(normalizedNricFin);

  if (!normalized) return;



  const existing = await findUserByVerifiedNricFin(userRepository, normalized);

  if (!existing) return;



  if (existing.isDraft) {

    return;

  }



  throw new BadRequestException(NRIC_ALREADY_REGISTERED_MESSAGE);

}



export function assignVerifiedNricFinToUser(user: UserEntity, normalizedNricFin: string): void {

  const normalized = normalizeSingaporeNricFin(normalizedNricFin);

  if (!normalized) return;

  user.nricFinCanonicalValue = normalized;

  user.nricFinValue = maskSingaporeNricFin(normalized);

}


