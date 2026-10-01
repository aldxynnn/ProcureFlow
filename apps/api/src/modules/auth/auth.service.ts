import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHmac } from 'node:crypto';
import { Response } from 'express';
import { compare } from 'bcryptjs';
import { PrismaService } from '../../common/database/prisma.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(private readonly users: UsersService, private readonly prisma: PrismaService, private readonly jwt: JwtService, private readonly config: ConfigService) {}

  async login(email: string, password: string, organizationSlug: string, response: Response) {
    const user = await this.users.findByLogin(email, organizationSlug.trim().toLowerCase());
    if (!user || !(await compare(password, user.passwordHash))) throw new UnauthorizedException('Invalid credentials');
    const accessToken = await this.jwt.signAsync({ sub: user.id, organizationId: user.organizationId, role: user.role, name: user.name, email: user.email, departmentId: user.departmentId });
    const refreshToken = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({ data: { userId: user.id, tokenHash: this.hashRefresh(refreshToken), expiresAt: new Date(Date.now() + this.refreshDays() * 86400000) } });
    response.cookie('procureflow_refresh', refreshToken, { httpOnly: true, secure: this.config.get('COOKIE_SECURE') === 'true', sameSite: 'lax', domain: this.config.get('COOKIE_DOMAIN') || undefined, path: '/api/auth' });
    return { accessToken, user: this.publicUser(user) };
  }

  async refresh(raw: string | undefined, response: Response) {
    if (!raw) throw new UnauthorizedException('Missing refresh token');
    const token = await this.prisma.refreshToken.findFirst({ where: { tokenHash: this.hashRefresh(raw), revokedAt: null, expiresAt: { gt: new Date() } }, include: { user: true } });
    if (!token) throw new UnauthorizedException('Invalid refresh token');
    if (!token.user.isActive) {
      await this.prisma.refreshToken.update({ where: { id: token.id }, data: { revokedAt: new Date() } });
      throw new UnauthorizedException('Account is inactive');
    }
    await this.prisma.refreshToken.update({ where: { id: token.id }, data: { revokedAt: new Date() } });
    const fresh = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({ data: { userId: token.userId, tokenHash: this.hashRefresh(fresh), expiresAt: new Date(Date.now() + this.refreshDays() * 86400000) } });
    const accessToken = await this.jwt.signAsync({ sub: token.user.id, organizationId: token.user.organizationId, role: token.user.role, name: token.user.name, email: token.user.email, departmentId: token.user.departmentId });
    response.cookie('procureflow_refresh', fresh, { httpOnly: true, secure: this.config.get('COOKIE_SECURE') === 'true', sameSite: 'lax', domain: this.config.get('COOKIE_DOMAIN') || undefined, path: '/api/auth' });
    return { accessToken, user: this.publicUser(token.user) };
  }

  async logout(raw: string | undefined, response: Response) {
    if (raw) await this.prisma.refreshToken.updateMany({ where: { tokenHash: this.hashRefresh(raw), revokedAt: null }, data: { revokedAt: new Date() } });
    response.clearCookie('procureflow_refresh', { httpOnly: true, secure: this.config.get('COOKIE_SECURE') === 'true', sameSite: 'lax', path: '/api/auth', domain: this.config.get('COOKIE_DOMAIN') || undefined });
    return { success: true };
  }

  private hashRefresh(token: string) { return createHmac('sha256', this.config.getOrThrow<string>('JWT_REFRESH_SECRET')).update(token).digest('hex'); }
  private refreshDays() { return Number(this.config.get('REFRESH_TOKEN_DAYS') ?? 14); }
  private publicUser(user: any) { return { id: user.id, name: user.name, email: user.email, role: user.role, organizationId: user.organizationId, departmentId: user.departmentId }; }
}
