import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { IntlLoginDto, IntlRegisterDto } from './intl-auth.dto';
import {
  InternationalAuthProvider,
  InternationalUserEntity,
  InternationalUserStatus,
} from './international-user.entity';

const INTL_JWT_TYP = 'intl';
const ACCESS_TOKEN_EXPIRES = '7d';

@Injectable()
export class IntlAuthService {
  constructor(
    @InjectRepository(InternationalUserEntity)
    private readonly userRepository: Repository<InternationalUserEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: IntlRegisterDto) {
    const email = String(dto.email || '').trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new BadRequestException('An account with this email already exists');
    }

    if (dto.jobFunction === 'others' && !String(dto.jobFunctionOther || '').trim()) {
      throw new BadRequestException('Please specify your job function');
    }

    const years = Number(dto.yearsOfExperience);
    if (!Number.isInteger(years) || years < 0 || years > 80) {
      throw new BadRequestException('Enter a valid number of years between 0 and 80');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const username = await this.buildUniqueUsername(email);

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
      countryOfResidence: String(dto.countryOfResidence || '').trim() || null,
      promoCode: String(dto.promoCode || '').trim() || null,
      isVerified: true,
      status: InternationalUserStatus.Active,
    });

    const saved = await this.userRepository.save(user);
    const accessToken = this.signAccessToken(saved);

    return {
      message: 'Account created successfully',
      accessToken,
      user: this.toPublicUser(saved),
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

    if (!user || user.status !== InternationalUserStatus.Active) {
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

    return {
      message: 'Signed in successfully',
      accessToken: this.signAccessToken(user),
      user: this.toPublicUser(user),
    };
  }

  async me(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || user.status !== InternationalUserStatus.Active) {
      throw new UnauthorizedException('Unauthorized');
    }
    return this.toPublicUser(user);
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
      promoCode: user.promoCode,
      authProvider: user.authProvider,
      avatarUrl: user.avatarUrl,
      isVerified: user.isVerified,
      status: user.status,
      createdAt: user.createdAt,
    };
  }
}
