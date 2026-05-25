import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserEntity } from './../user/users.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { extractAccessTokenFromRequest } from './jwt-token.extractor';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = extractAccessTokenFromRequest(request);

    if (!token) throw new UnauthorizedException('No token provided');
    try {
      const decoded = this.jwtService.verify(token, { secret: process.env.JWT_SECRET });
      const user = await this.userRepository.findOne({
        where: { id: decoded.id },
      });

      if (!user) {
        throw new UnauthorizedException('User not found. Please log in again.');
      }

      request.user = decoded; // Attach user info to request
      return true;
    } catch {
      throw new UnauthorizedException('Session expired or invalid. Please log in again.');
    }
  }
}
