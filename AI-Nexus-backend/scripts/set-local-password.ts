/**
 * Set all users to LOCAL auth with a shared password (default: User@123).
 *
 * Usage (local):
 *   npm run users:set-local-password
 *
 * Usage (production — point DATABASE_URL at prod first):
 *   DRY_RUN=true npm run users:set-local-password   # preview only
 *   CONFIRM_PROD=true npm run users:set-local-password
 *
 * Optional env:
 *   LOCAL_USER_PASSWORD=User@123
 *   DRY_RUN=true
 *   CONFIRM_PROD=true   (required when DATABASE_URL is not localhost)
 */
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { UserEntity, AuthProvider } from '../src/user/users.entity';

dotenv.config();

const DEFAULT_PASSWORD = (process.env.LOCAL_USER_PASSWORD || 'User@123').trim();
const DRY_RUN = process.env.DRY_RUN === 'true';
const CONFIRM_PROD = process.env.CONFIRM_PROD === 'true';

function buildDataSource(): DataSource {
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  let cleanUrl = dbUrl.replace(/[?&]sslmode=[^&]*/g, '');
  cleanUrl = cleanUrl.replace(/[?&]$/, '');

  const isLocal =
    dbUrl.includes('localhost') ||
    dbUrl.includes('127.0.0.1');

  if (!isLocal && !CONFIRM_PROD && !DRY_RUN) {
    throw new Error(
      'Production DATABASE_URL detected. Set CONFIRM_PROD=true to apply, or DRY_RUN=true to preview.',
    );
  }

  return new DataSource({
    type: 'postgres',
    url: cleanUrl,
    entities: [UserEntity],
    synchronize: false,
    ssl: isLocal
      ? false
      : {
          rejectUnauthorized: false,
        },
  });
}

async function main() {
  if (!DEFAULT_PASSWORD) {
    throw new Error('LOCAL_USER_PASSWORD cannot be empty');
  }

  const dataSource = buildDataSource();

  try {
    await dataSource.initialize();
    console.log(`Database connected (${DRY_RUN ? 'DRY RUN' : 'LIVE'})`);
    console.log(`Password to set: ${DEFAULT_PASSWORD}`);

    const userRepository = dataSource.getRepository(UserEntity);
    const users = await userRepository.find({
      order: { email: 'ASC' },
    });

    const withEmail = users.filter((user) => Boolean(user.email?.trim()));
    if (!withEmail.length) {
      console.log('No users with email found.');
      return;
    }

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    let updated = 0;

    for (const user of withEmail) {
      const email = user.email!.trim();
      const wasLocal = user.authProvider === AuthProvider.LOCAL;
      const changes: string[] = [];

      if (user.authProvider !== AuthProvider.LOCAL) {
        changes.push(`authProvider: ${user.authProvider} -> LOCAL`);
      }
      if (!user.isVerified) {
        changes.push('isVerified: false -> true');
      }
      changes.push('password: updated');

      console.log(
        `${DRY_RUN ? '[dry-run] ' : ''}${email} (${user.role})${changes.length ? ` — ${changes.join(', ')}` : ''}`,
      );

      if (!DRY_RUN) {
        user.authProvider = AuthProvider.LOCAL;
        user.password = passwordHash;
        user.isVerified = true;
        await userRepository.save(user);
      }

      updated += 1;
    }

    console.log(
      `\n${DRY_RUN ? 'Would update' : 'Updated'} ${updated} user(s) to LOCAL auth with password "${DEFAULT_PASSWORD}".`,
    );
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
