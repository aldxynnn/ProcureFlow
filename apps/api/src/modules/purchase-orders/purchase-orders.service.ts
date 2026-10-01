import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../../common/auth/types';
import { Role, PurchaseOrderStatus } from '@prisma/client';
import { serializeBigInt } from '../../common/utils/bigint';
import { randomUUID } from 'node:crypto';

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async list(user: AuthUser) {
    return serializeBigInt(await this.prisma.purchaseOrder.findMany({
      where: { organizationId: user.organizationId, ...(user.role === Role.MANAGER ? { sourceQuote: { rfq: { purchaseRequest: { requester: { managerId: user.id } } } } } : {}) },
      include: { vendor: true, items: true, receipts: true, invoices: true, sourceQuote: { select: { id: true } }, approvedBy: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }));
  }

  async get(user: AuthUser, id: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { vendor: true, items: true, receipts: { include: { items: true } }, invoices: { include: { items: true } }, sourceQuote: { include: { rfq: { include: { purchaseRequest: { select: { id: true, title: true, requester: { select: { managerId: true } } } } } } } }, approvedBy: { select: { id: true, name: true, role: true } } },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (user.role === Role.MANAGER && po.sourceQuote?.rfq.purchaseRequest.requester.managerId !== user.id) throw new ForbiddenException('Purchase order is outside manager scope');
    return serializeBigInt(po);
  }

  async createFromQuote(user: AuthUser, quoteId: string) {
    if (![Role.PROCUREMENT, Role.ADMIN].includes(user.role as any)) throw new ForbiddenException();
    const quote = await this.prisma.vendorQuote.findFirst({
      where: { id: quoteId, organizationId: user.organizationId, status: 'SELECTED' },
      include: { vendor: true, rfq: { include: { purchaseRequest: { include: { items: true } } } }, items: true },
    });
    if (!quote) throw new BadRequestException('Only the selected quote can become a purchase order');
    if (await this.prisma.purchaseOrder.findFirst({ where: { organizationId: user.organizationId, sourceQuoteId: quoteId } })) throw new BadRequestException('A purchase order already exists for this selected quote');
    const requestItems = new Map(quote.rfq.purchaseRequest.items.map(i => [i.id, i]));
    if (!quote.items.length) throw new BadRequestException('Selected quote has no line items');
    const subtotal = quote.items.reduce((sum, i) => sum + Math.round(Number(i.quantity) * Number(i.unitPriceCents)), 0);
    const number = `PO-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const po = await this.prisma.purchaseOrder.create({
      data: {
        organizationId: user.organizationId, vendorId: quote.vendorId, sourceQuoteId: quote.id, createdById: user.id, number,
        subtotalCents: subtotal, taxCents: quote.taxCents, totalCents: subtotal + Number(quote.taxCents), status: PurchaseOrderStatus.DRAFT,
        items: { create: quote.items.map(i => {
          const original = requestItems.get(i.purchaseRequestItemId ?? '');
          return { purchaseRequestItemId: i.purchaseRequestItemId, vendorQuoteItemId: i.id, description: original?.description ?? i.description, unit: original?.unit ?? i.unit, quantityOrdered: i.quantity, unitPriceCents: i.unitPriceCents };
        }) },
      },
      include: { vendor: true, items: true },
    });
    await this.audit.record({ organizationId: user.organizationId, actorId: user.id, action: 'CREATE_PURCHASE_ORDER', entityType: 'PurchaseOrder', entityId: po.id, newValue: { status: po.status, number: po.number, totalCents: po.totalCents.toString() } });
    return serializeBigInt(po);
  }

  async approve(user: AuthUser, id: string) {
    if (![Role.MANAGER, Role.FINANCE, Role.ADMIN].includes(user.role as any)) throw new ForbiddenException();
    const po = await this.prisma.purchaseOrder.findFirst({ where: { id, organizationId: user.organizationId }, select: { id: true, status: true, createdById: true, approvedAt: true, sourceQuote: { select: { rfq: { select: { purchaseRequest: { select: { id: true, title: true, requester: { select: { managerId: true } } } } } } } } } });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== PurchaseOrderStatus.DRAFT || po.approvedAt) throw new BadRequestException('Only a pending draft purchase order can be approved');
    if (po.createdById === user.id) throw new ForbiddenException('The creator cannot approve their own purchase order');
    if (user.role === Role.MANAGER && po.sourceQuote?.rfq.purchaseRequest.requester.managerId !== user.id) throw new ForbiddenException('Purchase order is outside manager scope');
    const updated = await this.prisma.purchaseOrder.update({ where: { id }, data: { approvedAt: new Date(), approvedById: user.id }, include: { vendor: true, items: true, approvedBy: { select: { id: true, name: true, role: true } } } });
    await this.audit.record({ organizationId: user.organizationId, actorId: user.id, action: 'APPROVE_PURCHASE_ORDER', entityType: 'PurchaseOrder', entityId: id, oldValue: { approvedAt: null }, newValue: { approvedAt: updated.approvedAt, approvedById: user.id } });
    return serializeBigInt(updated);
  }

  async issue(user: AuthUser, id: string) {
    if (![Role.PROCUREMENT, Role.ADMIN].includes(user.role as any)) throw new ForbiddenException();
    const result = await this.prisma.$transaction(async tx => {
      const po = await tx.purchaseOrder.findFirst({ where: { id, organizationId: user.organizationId }, include: { sourceQuote: { include: { rfq: { include: { purchaseRequest: { include: { budget: true } } } } } } } });
      if (!po) throw new NotFoundException('Purchase order not found');
      if (po.status !== PurchaseOrderStatus.DRAFT) throw new BadRequestException('Only draft purchase orders can be issued');
      if (!po.approvedAt) throw new BadRequestException('Purchase order must be approved before it can be issued');
      const budgetId = po.sourceQuote?.rfq.purchaseRequest.budgetId;
      if (budgetId) {
        const budget = po.sourceQuote!.rfq.purchaseRequest.budget;
        if (!budget) throw new BadRequestException('Budget reference is invalid');
        await tx.$queryRaw`SELECT id FROM "Budget" WHERE id = ${budgetId} FOR UPDATE`;
        const lockedBudget = await tx.budget.findUniqueOrThrow({ where: { id: budgetId } });
        const available =
          Number(lockedBudget.allocatedCents) -
          Number(lockedBudget.committedCents) -
          Number(lockedBudget.verifiedCents);
        if (Number(po.totalCents) > available) throw new BadRequestException('PO exceeds available procurement budget');
        await tx.budget.update({ where: { id: budgetId }, data: { committedCents: { increment: po.totalCents } } });
      }
      return tx.purchaseOrder.update({ where: { id }, data: { status: PurchaseOrderStatus.ISSUED, issuedAt: new Date() }, include: { vendor: true, items: true, approvedBy: { select: { id: true, name: true, role: true } } } });
    });
    await this.audit.record({ organizationId: user.organizationId, actorId: user.id, action: 'ISSUE_PURCHASE_ORDER', entityType: 'PurchaseOrder', entityId: id, oldValue: { status: 'DRAFT' }, newValue: { status: result.status, issuedAt: result.issuedAt } });
    return serializeBigInt(result);
  }
}
