import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { extractAccessTokenFromRequest } from './jwt-token.extractor';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) {}

    canActivate(context: ExecutionContext): boolean {
        const request: Request = context.switchToHttp().getRequest();
        const token = extractAccessTokenFromRequest(request);
      
        if (token) {
            try {
                const decoded = this.jwtService.verify(token, { secret: process.env.JWT_SECRET });
                request.user = decoded;
            } catch {
                request.user = undefined;
            }
        }

        return true; // Always allow, this is optional auth
    }
}
