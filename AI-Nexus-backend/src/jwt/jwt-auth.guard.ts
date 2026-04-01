import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) {}

    canActivate(context: ExecutionContext): boolean {
        const request: Request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);
      
        if (!token) throw new UnauthorizedException('Token is required for authentication');

        try {
            const decoded = this.jwtService.verify(token,{ secret: process.env.JWT_SECRET });
            request.user = decoded;
            return true;
        } catch {
            throw new UnauthorizedException('Invalid or expired token');
        }
    }

    private extractTokenFromHeader(request: Request): string | null {
        const [_, token] = request.headers.authorization?.split(' ') ?? [];
        return token || null;
    }
}
