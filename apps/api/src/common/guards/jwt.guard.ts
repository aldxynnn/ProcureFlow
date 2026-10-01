import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';

interface JwtPayload {
  sub?: string;
  organizationId?: string;
  role?: Role;
  name?: string;
  email?: string;
  departmentId?: string;
}

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const header = req.headers.authorization as string | undefined;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Missing access token');

    try {
      const payload = this.jwt.verify<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });

      if (!payload.sub || !payload.organizationId || !payload.role || !payload.name || !payload.email) {
        throw new UnauthorizedException('Invalid access token payload');
      }

      req.user = {
        id: payload.sub,
        organizationId: payload.organizationId,
        role: payload.role,
        name: payload.name,
        email: payload.email,
        departmentId: payload.departmentId,
      };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
