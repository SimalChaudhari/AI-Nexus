import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { resolveCountryCode, resolveCurrencyForCountry } from '../intl-payment/intl-currency';
import { IntlLoginDto, IntlRegisterDto } from './intl-auth.dto';
import {
  InternationalAuthProvider,
  InternationalMembershipType,
  InternationalUserEntity,
  InternationalUserPaymentStatus,
  InternationalUserStatus,
} from './international-user.entity';

const INTL_JWT_TYP = 'intl';
const INTL_DRAFT_JWT_TYP = 'intl_draft';
const ACCESS_TOKEN_EXPIRES = '7d';

function normalizeMembershipType(value: unknown): InternationalMembershipType {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === InternationalMembershipType.Student) {
    return InternationalMembershipType.Student;
  }
  return InternationalMembershipType.Full;
}

@Injectable()
export class IntlAuthService {
  constructor(
    @InjectRepository(InternationalUserEntity)
    private readonly userRepository: Repository<InternationalUserEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: IntlRegisterDto) {
    if (!dto.paymentConsent) {
      throw new BadRequestException('Please confirm the payable amount to continue.');
    }

    const email = String(dto.email || '').trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      if (
        existing.status === InternationalUserStatus.PendingPayment
        && existing.paymentStatus !== InternationalUserPaymentStatus.Paid
      ) {
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const countryOfResidence = String(dto.countryOfResidence || '').trim() || null;
        const countryCode = resolveCountryCode(countryOfResidence || '');
        existing.salutation = String(dto.salutation || '').trim() || null;
        existing.firstname = String(dto.firstName || '').trim();
        existing.lastname = String(dto.lastName || '').trim();
        existing.password = hashedPassword;
        existing.contactNumber = String(dto.contactNumber || '').trim() || null;
        existing.companyCode = String(dto.companyCode || '').trim() || null;
        existing.company = String(dto.company || '').trim() || null;
        existing.jobFunction = String(dto.jobFunction || '').trim() || null;
        existing.jobFunctionOther =
          dto.jobFunction === 'others' ? String(dto.jobFunctionOther || '').trim() || null : null;
        existing.countryOfResidence = countryOfResidence;
        existing.countryCode = countryCode || null;
        existing.currency = resolveCurrencyForCountry(countryOfResidence || '');
        existing.promoCode = String(dto.promoCode || '').trim() || null;
        existing.membershipType = normalizeMembershipType(dto.membershipType);
        existing.paymentStatus = InternationalUserPaymentStatus.Unpaid;
        const saved = await this.userRepository.save(existing);
        return {
          message: 'Registration draft updated. Continue to payment.',
          draftUserId: saved.id,
          signupAccessToken: this.signDraftAccessToken(saved.id),
          user: this.toPublicUser(saved),
          requiresPayment: true,
        };
      }
      throw new BadRequestException('An account with this email already exists');
    }

    if (
      String(dto.jobFunction || '').trim() === 'others'
      && !String(dto.jobFunctionOther || '').trim()
    ) {
      throw new BadRequestException('Please specify your job function');
    }

    let years: number | null = null;
    if (dto.yearsOfExperience != null && String(dto.yearsOfExperience).trim() !== '') {
      years = Number(dto.yearsOfExperience);
      if (!Number.isInteger(years) || years < 0 || years > 80) {
        throw new BadRequestException('Enter a valid number of years between 0 and 80');
      }
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const username = await this.buildUniqueUsername(email);
    const countryOfResidence = String(dto.countryOfResidence || '').trim() || null;
    const countryCode = resolveCountryCode(countryOfResidence || '');

    const user = this.userRepository.create({
      email,
      username,
      salutation: String(dto.salutation || '').trim() || null,
      firstname: String(dto.firstName || '').trim(),
      lastname: String(dto.lastName || '').trim(),
      password: hashedPassword,
      authProvider: InternationalAuthProvider.LOCAL,
      contactNumber: String(dto.contactNumber || '').trim() || null,
      companyCode: String(dto.companyCode || '').trim() || null,
      company: String(dto.company || '').trim() || null,
      jobFunction: String(dto.jobFunction || '').trim() || null,
      jobFunctionOther:
        dto.jobFunction === 'others' ? String(dto.jobFunctionOther || '').trim() || null : null,
      yearsOfExperience: years,
      countryOfResidence,
      countryCode: countryCode || null,
      currency: resolveCurrencyForCountry(countryOfResidence || ''),
      promoCode: String(dto.promoCode || '').trim() || null,
      membershipType: normalizeMembershipType(dto.membershipType),
      isVerified: false,
      paymentStatus: InternationalUserPaymentStatus.Unpaid,
      status: InternationalUserStatus.PendingPayment,
    });

    const saved = await this.userRepository.save(user);

    return {
      message: 'Registration draft saved. Continue to payment.',
      draftUserId: saved.id,
      signupAccessToken: this.signDraftAccessToken(saved.id),
      user: this.toPublicUser(saved),
      requiresPayment: true,
    };
  }

  async login(dto: IntlLoginDto) {
    const identifier = String(dto.identifier || '').trim().toLowerCase();
    if (!identifier) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = await this.userRepository
      .createQueryBuilder('u')
      .where('LOWER(u.email) = :identifier OR LOWER(u.username) = :identifier', { identifier })
      .getOne();

    if (!user || user.status === InternationalUserStatus.Banned) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status === InternationalUserStatus.PendingPayment) {
      throw new UnauthorizedException(
        'Payment is required before you can sign in. Please complete registration payment.',
      );
    }

    if (user.status !== InternationalUserStatus.Active) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.authProvider !== InternationalAuthProvider.LOCAL || !user.password) {
      throw new UnauthorizedException(
        'This account uses a different sign-in method. OAuth sign-in will be available soon.',
      );
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueSessionForUser(user, 'Signed in successfully');
  }

  async me(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || user.status !== InternationalUserStatus.Active) {
      throw new UnauthorizedException('Unauthorized');
    }
    return this.toPublicUser(user);
  }

  issueSessionForUser(user: InternationalUserEntity, message = 'Account ready') {
    return {
      message,
      accessToken: this.signAccessToken(user),
      user: this.toPublicUser(user),
    };
  }

  async listUsers(options: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    paymentStatus?: string;
  } = {}) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const search = String(options.search || '').trim();
    const status = String(options.status || '').trim();
    const paymentStatus = String(options.paymentStatus || '').trim();

    const qb = this.userRepository.createQueryBuilder('u').orderBy('u.createdAt', 'DESC');

    if (search) {
      qb.andWhere(
        `(u.email ILIKE :q OR u.username ILIKE :q OR u.firstname ILIKE :q OR u.lastname ILIKE :q OR COALESCE(u.company, '') ILIKE :q)`,
        { q: `%${search}%` }
      );
    }
    if (status) {
      qb.andWhere('u.status = :status', { status });
    }
    if (paymentStatus) {
      qb.andWhere('u.paymentStatus = :paymentStatus', { paymentStatus });
    }

    const [rows, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: rows.map((row) => this.toPublicUser(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  /** Admin: fetch one international user by id. */
  async getUserById(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('International user not found');
    }
    return this.toPublicUser(user);
  }

  /** Admin: permanently delete an international user (payments cascade). */
  async deleteUser(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('International user not found');
    }
    await this.userRepository.remove(user);
    return { message: 'International user deleted', id: userId };
  }

  signDraftAccessToken(userId: string) {
    return this.jwtService.sign(
      { sub: userId, typ: INTL_DRAFT_JWT_TYP },
      { expiresIn: '2h' },
    );
  }

  verifyAccessToken(token: string): { id: string } {
    try {
      const payload = this.jwtService.verify(token) as { sub?: string; typ?: string };
      if (payload?.typ !== INTL_JWT_TYP || !payload?.sub) {
        throw new UnauthorizedException('Invalid token');
      }
      return { id: payload.sub };
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private signAccessToken(user: InternationalUserEntity) {
    return this.jwtService.sign(
      { sub: user.id, email: user.email, typ: INTL_JWT_TYP },
      { expiresIn: ACCESS_TOKEN_EXPIRES },
    );
  }

  private async buildUniqueUsername(email: string) {
    const base = email
      .split('@')[0]
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 24)
      .toLowerCase();
    const seed = base && /[a-z]/.test(base) && /\d/.test(base) ? base : `${base || 'user'}1`;

    let candidate = seed;
    let attempt = 0;
    while (await this.userRepository.findOne({ where: { username: candidate } })) {
      attempt += 1;
      candidate = `${seed}${attempt}`.slice(0, 40);
      if (attempt > 50) {
        candidate = `user${Date.now().toString(36)}`;
        break;
      }
    }
    return candidate;
  }

  private toPublicUser(user: InternationalUserEntity) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      salutation: user.salutation,
      firstName: user.firstname,
      lastName: user.lastname,
      contactNumber: user.contactNumber,
      companyCode: user.companyCode,
      company: user.company,
      jobFunction: user.jobFunction,
      jobFunctionOther: user.jobFunctionOther,
      yearsOfExperience: user.yearsOfExperience,
      countryOfResidence: user.countryOfResidence,
      countryCode: user.countryCode,
      currency: user.currency,
      promoCode: user.promoCode,
      membershipType: normalizeMembershipType(user.membershipType),
      paymentStatus: user.paymentStatus,
      authProvider: user.authProvider,
      avatarUrl: user.avatarUrl,
      isVerified: user.isVerified,
      status: user.status,
      createdAt: user.createdAt,
    };
  }
}
