import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuthUser } from '../../common/auth/types';
import { Role } from '@prisma/client';
import { serializeBigInt } from '../../common/utils/bigint';
import { ROLE_RESPONSIBILITIES } from './role-responsibilities';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async get(user: AuthUser) {
    const tenant = { organizationId: user.organizationId };
    const isManager = user.role === Role.MANAGER;
    const canProcure = user.role === Role.PROCUREMENT || user.role === Role.ADMIN;
    const canFinance = user.role === Role.FINANCE || user.role === Role.ADMIN;
    const canSeeRequests = user.role !== Role.FINANCE;

    const requestWhere = user.role === Role.EMPLOYEE
      ? { ...tenant, requesterId: user.id }
      : user.role === Role.MANAGER
        ? { ...tenant, OR: [{ requesterId: user.id }, { requester: { managerId: user.id } }] }
        : user.role === Role.PROCUREMENT
          ? { ...tenant, status: 'APPROVED' as const }
          : tenant;

    const activePoWhere = user.role === Role.MANAGER
      ? { ...tenant, sourceQuote: { rfq: { purchaseRequest: { requester: { managerId: user.id } } } }, status: { in: ['ISSUED', 'PARTIALLY_RECEIVED'] as any } }
      : { ...tenant, status: { in: ['ISSUED', 'PARTIALLY_RECEIVED'] as any } };

    const [pendingApprovals, visibleRequests, approvedRequests, openRfqs, quotes, activePurchaseOrders, pendingPurchaseOrders, invoices, budgets, userCount, vendorCount, recentRequests, activePoRows] = await Promise.all([
      user.role === Role.EMPLOYEE
        ? this.prisma.purchaseRequest.count({ where: { ...tenant, requesterId: user.id, status: 'PENDING_APPROVAL' } })
        : isManager || user.role === Role.ADMIN
          ? this.prisma.purchaseRequest.count({ where: { ...tenant, status: 'PENDING_APPROVAL', ...(isManager ? { requester: { managerId: user.id } } : {}) } })
          : Promise.resolve(0),
      canSeeRequests ? this.prisma.purchaseRequest.count({ where: requestWhere }) : Promise.resolve(0),
      canSeeRequests ? this.prisma.purchaseRequest.count({ where: { ...requestWhere, status: 'APPROVED' } as any }) : Promise.resolve(0),
      canProcure ? this.prisma.rfq.count({ where: { ...tenant, status: 'OPEN' } }) : Promise.resolve(0),
      canProcure ? this.prisma.vendorQuote.count({ where: { ...tenant, status: 'SUBMITTED', rfq: { status: 'OPEN' } } }) : Promise.resolve(0),
      (canProcure || canFinance || isManager) ? this.prisma.purchaseOrder.count({ where: activePoWhere as any }) : Promise.resolve(0),
      (user.role === Role.MANAGER || canFinance) ? this.prisma.purchaseOrder.count({ where: { ...tenant, status: 'DRAFT', approvedAt: null, ...(isManager ? { sourceQuote: { rfq: { purchaseRequest: { requester: { managerId: user.id } } } } } : {}) } as any }) : Promise.resolve(0),
      canFinance || user.role === Role.PROCUREMENT ? this.prisma.invoice.count({ where: { ...tenant, status: { in: ['SUBMITTED', 'DISCREPANCY', 'VERIFIED'] } } }) : Promise.resolve(0),
      this.prisma.budget.count({ where: tenant }),
      user.role === Role.ADMIN ? this.prisma.user.count({ where: tenant }) : Promise.resolve(0),
      canProcure || user.role === Role.FINANCE ? this.prisma.vendor.count({ where: { ...tenant, isActive: true } }) : Promise.resolve(0),
      canSeeRequests ? this.prisma.purchaseRequest.findMany({ where: requestWhere as any, include: { requester: { select: { name: true } }, department: true }, orderBy: { createdAt: 'desc' }, take: 6 }) : Promise.resolve([]),
      canProcure ? this.prisma.purchaseOrder.findMany({ where: { ...tenant, status: { in: ['ISSUED', 'PARTIALLY_RECEIVED'] } }, include: { items: true } }) : Promise.resolve([]),
    ]);

    const receiptsDue = canProcure ? (activePoRows as any[]).filter(po => po.items.some((item: any) => Number(item.quantityOrdered) > Number(item.quantityReceived))).length : 0;
    const responsibilities = ROLE_RESPONSIBILITIES[user.role];

    return serializeBigInt({
      role: user.role,
      responsibilities,
      metrics: { pendingApprovals, visibleRequests, approvedRequests, openRfqs, quotesAwaitingAction: quotes, activePurchaseOrders, pendingPurchaseOrders, invoicesNeedingAttention: invoices, receiptsDue, budgetCount: budgets, userCount, vendorCount },
      budgets: user.role === Role.EMPLOYEE ? [] : await this.prisma.budget.findMany({ where: tenant, include: { department: true }, orderBy: { updatedAt: 'desc' }, take: 5 }),
      recentRequests,
    });
  }
}
