import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthUser } from '../../common/auth/types';
import { InvoiceStatus, MatchResult, NotificationType, Role } from '@prisma/client';
import { serializeBigInt } from '../../common/utils/bigint';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly notifications: NotificationsService) {}

  async list(user: AuthUser) {
    return serializeBigInt(await this.prisma.invoice.findMany({ where: { organizationId: user.organizationId }, include: { vendor: true, purchaseOrder: { select: { number: true, totalCents: true, status: true } }, items: true }, orderBy: { createdAt: 'desc' }, take: 100 }));
  }

  async get(user: AuthUser, id: string) {
    const inv = await this.prisma.invoice.findFirst({ where: { id, organizationId: user.organizationId }, include: { vendor: true, purchaseOrder: { include: { items: true, receipts: { include: { items: true } } } }, items: true, budget: true } });
    if (!inv) throw new NotFoundException('Invoice not found');
    return serializeBigInt(inv);
  }

  async create(user: AuthUser, body: any) {
    if (![Role.FINANCE, Role.PROCUREMENT, Role.ADMIN] .includes(user.role as any)) throw new ForbiddenException();
    const po = await this.prisma.purchaseOrder.findFirst({ where: { id: body.purchaseOrderId, organizationId: user.organizationId }, include: { vendor: true, items: true, sourceQuote: { include: { rfq: { include: { purchaseRequest: true } } } } } });
    if (!po) throw new BadRequestException('PO not found');
    if (!body.invoiceNumber?.trim()) throw new BadRequestException('Invoice number is required');
    if (![ 'ISSUED', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED' ].includes(po.status as any)) throw new BadRequestException('Invoices can only be recorded against an issued or received purchase order');
    const vendorId = body.vendorId ?? po.vendorId;
    if (vendorId !== po.vendorId) throw new BadRequestException('Invoice vendor must match PO vendor');
    if (!body.items?.length) throw new BadRequestException('Invoice needs line items');
    const invoiceDate = new Date(body.invoiceDate);
    if (Number.isNaN(invoiceDate.getTime())) throw new BadRequestException('Invalid invoice date');
    if (invoiceDate.getTime() > Date.now() + 24 * 60 * 60 * 1000) throw new BadRequestException('Invoice date cannot be in the future');
    const sourceBudgetId = po.sourceQuote?.rfq.purchaseRequest.budgetId ?? null;
    if (body.budgetId && body.budgetId !== sourceBudgetId) throw new BadRequestException('Invoice budget must match the source purchase request budget');
    const budgetId = sourceBudgetId ?? body.budgetId;
    if (budgetId && !(await this.prisma.budget.findFirst({ where: { id: budgetId, organizationId: user.organizationId } }))) throw new BadRequestException('Budget not found in tenant');

    const poMap = new Map(po.items.map(i => [i.id, i]));
    let subtotal = 0;
    const seenItems = new Set<string>();
    const lines = body.items.map((line: any) => {
      const pi = poMap.get(line.purchaseOrderItemId);
      if (!pi) throw new BadRequestException('Invoice item is outside this PO');
      if (seenItems.has(pi.id)) throw new BadRequestException('Each purchase order item may appear only once on an invoice');
      seenItems.add(pi.id);
      const qty = Number(line.quantityInvoiced); const unitPrice = Number(line.unitPrice); const price = Math.round(unitPrice * 100);
      if (!Number.isFinite(qty) || !Number.isFinite(unitPrice) || qty <= 0 || price < 0) throw new BadRequestException('Invalid invoice quantity/price');
      subtotal += qty * price;
      return { purchaseOrderItemId: pi.id, purchaseRequestItemId: pi.purchaseRequestItemId, description: pi.description, unit: pi.unit, quantityInvoiced: qty, unitPriceCents: price };
    });
    const taxAmount = Number(body.tax ?? 0);
    if (!Number.isFinite(taxAmount) || taxAmount < 0) throw new BadRequestException('Invalid invoice tax');
    const tax = Math.round(taxAmount * 100);
    let invoice;
    try {
      invoice = await this.prisma.invoice.create({ data: { organizationId: user.organizationId, vendorId, purchaseOrderId: po.id, budgetId, createdById: user.id, invoiceNumber: body.invoiceNumber.trim(), invoiceDate, status: InvoiceStatus.SUBMITTED, subtotalCents: Math.round(subtotal), taxCents: tax, totalCents: Math.round(subtotal) + tax, submittedAt: new Date(), items: { create: lines } }, include: { items: true } });
    } catch (error) { if ((error as any)?.code === 'P2002') throw new ConflictException('Invoice number already exists for this vendor'); throw error; }
    await this.audit.record({ organizationId: user.organizationId, actorId: user.id, action: 'CREATE_INVOICE', entityType: 'Invoice', entityId: invoice.id, newValue: { status: invoice.status, totalCents: invoice.totalCents.toString() } });
    return serializeBigInt(invoice);
  }

  private async verifyInternal(organizationId: string, id: string, actorId: string) {
    const result = await this.prisma.$transaction(async tx => {
      const base = await tx.invoice.findFirst({ where: { id, organizationId } });
      if (!base) throw new NotFoundException('Invoice not found');
      if (base.status !== InvoiceStatus.SUBMITTED) throw new BadRequestException('Invoice cannot be verified in its current state');
      await tx.$queryRaw`SELECT id FROM "PurchaseOrder" WHERE id = ${base.purchaseOrderId} AND "organizationId" = ${organizationId} FOR UPDATE`;
      const invoice = await tx.invoice.findFirst({ where: { id, organizationId }, include: { items: true, purchaseOrder: { include: { items: true, receipts: { include: { items: true } } } }, vendor: true } });
      if (!invoice) throw new NotFoundException('Invoice not found');
      const receivedByPoItem = new Map<string, number>();
      for (const receipt of invoice.purchaseOrder.receipts) for (const line of receipt.items) receivedByPoItem.set(line.purchaseOrderItemId, (receivedByPoItem.get(line.purchaseOrderItemId) ?? 0) + Number(line.quantityReceived));
      const priorByPoItem = new Map<string, number>();
      const priorInvoices = await tx.invoice.findMany({ where: { organizationId, purchaseOrderId: invoice.purchaseOrderId, id: { not: id }, status: { in: [InvoiceStatus.VERIFIED, InvoiceStatus.APPROVED] } }, include: { items: true } });
      for (const other of priorInvoices) for (const line of other.items) if (line.purchaseOrderItemId) priorByPoItem.set(line.purchaseOrderItemId, (priorByPoItem.get(line.purchaseOrderItemId) ?? 0) + Number(line.quantityInvoiced));
      const discrepancies: any[] = [];
      for (const line of invoice.items) {
        const poItem = invoice.purchaseOrder.items.find(i => i.id === line.purchaseOrderItemId);
        if (!poItem) { discrepancies.push({ lineId: line.id, reason: 'PO item missing' }); continue; }
        const received = receivedByPoItem.get(poItem.id) ?? 0;
        const previouslyInvoiced = priorByPoItem.get(poItem.id) ?? 0;
        const qty = Number(line.quantityInvoiced); const price = Number(line.unitPriceCents);
        if (qty + previouslyInvoiced > received) discrepancies.push({ lineId: line.id, reason: 'Cumulative invoice quantity exceeds received quantity', invoiceQty: qty, previouslyInvoiced, receivedQty: received });
        if (qty + previouslyInvoiced > Number(poItem.quantityOrdered)) discrepancies.push({ lineId: line.id, reason: 'Cumulative invoice quantity exceeds ordered quantity' });
        if (price !== Number(poItem.unitPriceCents)) discrepancies.push({ lineId: line.id, reason: 'Invoice unit price differs from PO', invoiceUnitPriceCents: price, poUnitPriceCents: Number(poItem.unitPriceCents) });
      }
      const match = discrepancies.length ? MatchResult.DISCREPANCY : MatchResult.MATCH;
      const status = discrepancies.length ? InvoiceStatus.DISCREPANCY : InvoiceStatus.VERIFIED;
      const updated = await tx.invoice.update({ where: { id }, data: { status, matchResult: match, matchingNotes: discrepancies.length ? JSON.stringify(discrepancies) : 'PO, goods receipt and invoice quantities/prices match.', verifiedAt: status === InvoiceStatus.VERIFIED ? new Date() : null }, include: { items: true, vendor: true, purchaseOrder: true } });
      return { updated, discrepancies, previousStatus: base.status, creatorId: base.createdById };
    });
    await this.audit.record({ organizationId, actorId, action: 'VERIFY_INVOICE', entityType: 'Invoice', entityId: id, oldValue: { status: result.previousStatus }, newValue: { status: result.updated.status, matchResult: result.updated.matchResult, discrepancies: result.discrepancies } });
    if (result.updated.status === InvoiceStatus.DISCREPANCY) await this.notifications.notify({ organizationId, userId: result.creatorId, type: NotificationType.INVOICE_DISCREPANCY, title: 'Invoice discrepancy detected', body: `${result.updated.invoiceNumber} needs review.` });
    return serializeBigInt(result.updated);
  }

  async verify(user: AuthUser, id: string) {
    if (![Role.FINANCE, Role.ADMIN] .includes(user.role as any)) throw new ForbiddenException();
    return this.verifyInternal(user.organizationId, id, user.id);
  }

  async approve(user: AuthUser, id: string) {
    if (user.role !== Role.FINANCE && user.role !== Role.ADMIN) throw new ForbiddenException();
    const result = await this.prisma.$transaction(async tx => {
      const invoice = await tx.invoice.findFirst({ where: { id, organizationId: user.organizationId } });
      if (!invoice) throw new NotFoundException('Invoice not found');
      if (invoice.status !== InvoiceStatus.VERIFIED) throw new BadRequestException('Invoice must be verified before approval');
      if (invoice.budgetId) {
        await tx.$queryRaw`SELECT id FROM "Budget" WHERE id = ${invoice.budgetId} FOR UPDATE`;
        const budget = await tx.budget.findUniqueOrThrow({ where: { id: invoice.budgetId } });
        if (Number(budget.committedCents) < Number(invoice.totalCents)) throw new BadRequestException('Budget commitment is smaller than invoice amount');
        await tx.budget.update({ where: { id: invoice.budgetId }, data: { committedCents: { decrement: invoice.totalCents }, verifiedCents: { increment: invoice.totalCents } } });
      }
      const updatedInvoice = await tx.invoice.update({ where: { id }, data: { status: InvoiceStatus.APPROVED, approvedAt: new Date() } });
      const po = await tx.purchaseOrder.findUnique({ where: { id: invoice.purchaseOrderId } });
      if (po?.status === 'FULLY_RECEIVED') await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: 'CLOSED', closedAt: new Date() } });
      return updatedInvoice;
    });
    await this.audit.record({ organizationId: user.organizationId, actorId: user.id, action: 'APPROVE_INVOICE', entityType: 'Invoice', entityId: id, oldValue: { status: 'VERIFIED' }, newValue: { status: result.status } });
    return serializeBigInt(result);
  }

  async reject(user: AuthUser, id: string, reason: string) {
    if (user.role !== Role.FINANCE && user.role !== Role.ADMIN) throw new ForbiddenException();
    if (!reason?.trim()) throw new BadRequestException('Rejection reason is required');
    const current = await this.prisma.invoice.findFirst({ where: { id, organizationId: user.organizationId } }); if (!current) throw new NotFoundException('Invoice not found');
    if (![InvoiceStatus.SUBMITTED, InvoiceStatus.DISCREPANCY].includes(current.status as any)) throw new BadRequestException('Only submitted or discrepancy invoices can be rejected');
    const updated = await this.prisma.invoice.update({ where: { id }, data: { status: InvoiceStatus.REJECTED, rejectedAt: new Date(), rejectionReason: reason } });
    await this.audit.record({ organizationId: user.organizationId, actorId: user.id, action: 'REJECT_INVOICE', entityType: 'Invoice', entityId: id, oldValue: { status: current.status }, newValue: { status: updated.status, reason } });
    return serializeBigInt(updated);
  }
}

