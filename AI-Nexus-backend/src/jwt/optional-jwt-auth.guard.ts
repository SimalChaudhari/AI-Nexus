import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) {}

    canActivate(context: ExecutionContext): boolean {
        const request: Request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);
      
        if (token) {
            try {
                const decoded = this.jwtService.verify(token, { secret: process.env.JWT_SECRET });
                request.user = decoded;
                console.log('✅ OptionalJwtAuthGuard: User authenticated:', decoded.id ? decoded.id.substring(0, 8) + '...' : 'no id');
            } catch (error) {
                // Token is invalid, but we don't throw - just continue without user
                console.log('⚠️ OptionalJwtAuthGuard: Invalid token, continuing without user');
                request.user = undefined;
            }
        } else {
            console.log('ℹ️ OptionalJwtAuthGuard: No token provided, continuing without user');
        }

        return true; // Always allow, this is optional auth
    }

    private extractTokenFromHeader(request: Request): string | null {
        const [_, token] = request.headers.authorization?.split(' ') ?? [];
        return token || null;
    }
}
