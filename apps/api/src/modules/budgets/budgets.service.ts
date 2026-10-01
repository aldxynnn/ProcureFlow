import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuthUser } from '../../common/auth/types';
import { Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { serializeBigInt } from '../../common/utils/bigint';

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}
  async list(user: AuthUser) {
    const rows = await this.prisma.budget.findMany({
      where: { organizationId: user.organizationId, ...(user.role === Role.EMPLOYEE && user.departmentId ? { OR: [{ departmentId: user.departmentId }, { departmentId: null }] } : {}) },
      include: { department: true },
      orderBy: [{ fiscalYear: 'desc' }, { name: 'asc' }],
    });
    return serializeBigInt(rows);
  }
  async create(user: AuthUser, body: { name: string; fiscalYear: number; allocatedAmount: number; departmentId?: string }) {
    if (![Role.MANAGER, Role.FINANCE, Role.ADMIN].includes(user.role as any)) throw new ForbiddenException();
    const name = body.name?.trim();
    if (!name) throw new BadRequestException('Budget name is required');
    const fiscalYear = Number(body.fiscalYear);
    if (!Number.isInteger(fiscalYear) || fiscalYear < 2000 || fiscalYear > 2200) throw new BadRequestException('Fiscal year must be a valid year');
    const amount = Number(body.allocatedAmount);
    if (!Number.isFinite(amount) || amount < 0) throw new BadRequestException('Allocated amount must be a non-negative number');
    if (body.departmentId) {
      const department = await this.prisma.department.findFirst({ where: { id: body.departmentId, organizationId: user.organizationId } });
      if (!department) throw new BadRequestException('Department not found in tenant');
    }
    try {
      const budget = await this.prisma.budget.create({ data: { organizationId: user.organizationId, departmentId: body.departmentId, name, fiscalYear, allocatedCents: BigInt(Math.round(amount * 100)) } });
      await this.audit.record({ organizationId: user.organizationId, actorId: user.id, action: 'CREATE_BUDGET', entityType: 'Budget', entityId: budget.id, newValue: { name, fiscalYear: budget.fiscalYear, allocatedCents: budget.allocatedCents.toString() } });
      return serializeBigInt(budget);
    } catch (error) {
      if ((error as any)?.code === 'P2002') throw new ConflictException('A budget with this name already exists for the fiscal year');
      throw error;
    }
  }
}
