import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuthUser } from '../../common/auth/types';
import { Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  list(user: AuthUser, q?: string) {
    const search = q?.trim();
    return this.prisma.vendor.findMany({
      where: { organizationId: user.organizationId, isActive: true, ...(search ? { OR: [{ displayName: { contains: search, mode: 'insensitive' } }, { legalName: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] } : {}) },
      include: { contacts: true },
      orderBy: { displayName: 'asc' },
    });
  }

  async create(user: AuthUser, body: any) {
    if (user.role !== Role.PROCUREMENT && user.role !== Role.ADMIN) throw new ForbiddenException();
    const legalName = body.legalName?.trim();
    const displayName = (body.displayName ?? body.legalName)?.trim();
    if (!legalName || !displayName) throw new BadRequestException('Vendor legal name and display name are required');
    try {
      const vendor = await this.prisma.vendor.create({ data: { organizationId: user.organizationId, legalName, displayName, taxId: body.taxId?.trim() || undefined, email: body.email?.trim().toLowerCase() || undefined, phone: body.phone?.trim() || undefined, address: body.address?.trim() || undefined, contacts: body.contact ? { create: [{ name: body.contact.name.trim(), email: body.contact.email?.trim().toLowerCase() || undefined, phone: body.contact.phone?.trim() || undefined, roleTitle: body.contact.roleTitle?.trim() || undefined }] } : undefined }, include: { contacts: true } });
      await this.audit.record({ organizationId: user.organizationId, actorId: user.id, action: 'CREATE_VENDOR', entityType: 'Vendor', entityId: vendor.id, newValue: { legalName: vendor.legalName, displayName: vendor.displayName } });
      return vendor;
    } catch (error) {
      if ((error as any)?.code === 'P2002') throw new ConflictException('Vendor legal name already exists for this organization');
      throw error;
    }
  }

  async get(user: AuthUser, id: string) {
    const v = await this.prisma.vendor.findFirst({ where: { id, organizationId: user.organizationId }, include: { contacts: true } });
    if (!v) throw new NotFoundException('Vendor not found');
    return v;
  }
}
