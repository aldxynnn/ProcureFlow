import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
  findByLogin(email: string, organizationSlug: string) {
    return this.prisma.user.findFirst({ where: { email: email.toLowerCase(), isActive: true, organization: { slug: organizationSlug } }, include: { organization: true } });
  }
  async me(id: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({ where: { id, organizationId }, select: { id: true, name: true, email: true, role: true, organizationId: true, departmentId: true, isActive: true, createdAt: true, organization: true, department: true } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
  list(organizationId: string) { return this.prisma.user.findMany({ where: { organizationId }, select: { id: true, name: true, email: true, role: true, departmentId: true, managerId: true, isActive: true, createdAt: true }, orderBy: { name: 'asc' } }); }
  roleValues() { return Object.values(Role); }
}
