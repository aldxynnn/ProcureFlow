import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { Role } from '@prisma/client';
import { hash } from 'bcryptjs';

@Injectable()
export class SetupService {
  constructor(private readonly prisma: PrismaService) {}

  async status() {
    return { initialized: (await this.prisma.organization.count()) > 0 };
  }

  async initialize(body: { organizationName: string; organizationSlug: string; adminName: string; adminEmail: string; adminPassword: string; departmentName: string; departmentCode: string }) {
    if ((await this.prisma.organization.count()) > 0) {
      throw new ConflictException('This database is already initialized');
    }
    const organizationName = body.organizationName.trim();
    const organizationSlug = body.organizationSlug.trim().toLowerCase();
    const adminName = body.adminName.trim();
    const adminEmail = body.adminEmail.trim().toLowerCase();
    const departmentName = body.departmentName.trim();
    const departmentCode = body.departmentCode.trim().toUpperCase();
    if (!organizationName || !organizationSlug || !adminName || !adminEmail || !departmentName || !departmentCode) throw new ConflictException('All workspace setup fields are required');
    const passwordHash = await hash(body.adminPassword, 12);

    return this.prisma.$transaction(async (tx) => {
      if ((await tx.organization.count()) > 0) {
        throw new ConflictException('This database is already initialized');
      }
      const organization = await tx.organization.create({
        data: { name: organizationName, slug: organizationSlug },
      });
      const department = await tx.department.create({
        data: { organizationId: organization.id, name: departmentName, code: departmentCode },
      });
      const admin = await tx.user.create({
        data: {
          organizationId: organization.id,
          departmentId: department.id,
          name: adminName,
          email: adminEmail,
          passwordHash,
          role: Role.ADMIN,
        },
        select: { id: true, name: true, email: true, role: true, organizationId: true },
      });
      return { organization, department, admin };
    });
  }
}
