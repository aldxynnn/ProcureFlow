import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../../common/auth/types';
import { Role, RfqStatus, QuoteStatus } from '@prisma/client';
import { serializeBigInt } from '../../common/utils/bigint';
import { JobsService } from '../jobs/jobs.service';
import { randomUUID } from 'node:crypto';

@Injectable()
export class RfqsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly jobs: JobsService) {}
  async list(user: AuthUser) { return serializeBigInt(await this.prisma.rfq.findMany({ where: { organizationId: user.organizationId }, include: { purchaseRequest: { select: { id: true, title: true } }, items: true, invitations: { include: { vendor: true } }, quotes: { include: { vendor: true, items: true } } }, orderBy: { createdAt: 'desc' }, take: 100 })); }
  async get(user: AuthUser, id: string) { const r = await this.prisma.rfq.findFirst({ where: { id, organizationId: user.organizationId }, include: { purchaseRequest: { include: { items: true, requester: { select: { name: true } } } }, items: true, invitations: { include: { vendor: true } }, quotes: { include: { vendor: true, items: true } } } }); if (!r) throw new NotFoundException('RFQ not found'); return serializeBigInt(r); }
  async inviteVendors(user: AuthUser, rfqId: string, vendorIds: string[]) {
    if (![Role.PROCUREMENT, Role.ADMIN].includes(user.role as any)) throw new ForbiddenException();
    const rfq = await this.prisma.rfq.findFirst({ where: { id: rfqId, organizationId: user.organizationId, status: RfqStatus.OPEN } });
    if (!rfq) throw new NotFoundException('Open RFQ not found');
    const uniqueIds=[...new Set((Array.isArray(vendorIds) ? vendorIds : []).filter(Boolean))];
    if (!uniqueIds.length) throw new BadRequestException('At least one active vendor must be invited');
    const vendors=await this.prisma.vendor.findMany({where:{organizationId:user.organizationId,id:{in:uniqueIds},isActive:true},select:{id:true}});
    if (vendors.length !== uniqueIds.length) throw new BadRequestException('One or more vendors are outside the organization or inactive');
    const result=await this.prisma.$transaction(uniqueIds.map(vendorId=>this.prisma.rfqInvitation.upsert({where:{rfqId_vendorId:{rfqId,vendorId}},update:{status:'INVITED'},create:{organizationId:user.organizationId,rfqId,vendorId,status:'INVITED'}})));
    await this.audit.record({organizationId:user.organizationId,actorId:user.id,action:'INVITE_RFQ_VENDORS',entityType:'Rfq',entityId:rfqId,newValue:{vendorIds:uniqueIds}});
    return serializeBigInt(result);
  }
  async create(user: AuthUser, body: any) {
    if (![Role.PROCUREMENT, Role.ADMIN].includes(user.role as any)) throw new ForbiddenException();
    const pr = await this.prisma.purchaseRequest.findFirst({ where: { id: body.purchaseRequestId, organizationId: user.organizationId, status: 'APPROVED' }, include: { items: true } });
    if (!pr) throw new BadRequestException('RFQ can only be created from an approved purchase request');
    if (await this.prisma.rfq.findFirst({ where: { purchaseRequestId: pr.id, organizationId: user.organizationId, status: { in: [RfqStatus.DRAFT, RfqStatus.OPEN, RfqStatus.CLOSED] } } })) throw new ConflictException('An RFQ already exists for this approved purchase request');
    if (!pr.items.length) throw new BadRequestException('Approved purchase request has no items');
    const deadline = body.responseDeadline ? new Date(body.responseDeadline) : new Date(Date.now() + 7 * 86400000);
    if (Number.isNaN(deadline.getTime()) || deadline.getTime() <= Date.now()) throw new BadRequestException('Response deadline must be a future date');
    const number = `RFQ-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const r = await this.prisma.rfq.create({ data: { organizationId: user.organizationId, purchaseRequestId: pr.id, createdById: user.id, number, title: body.title ?? pr.title, responseDeadline: deadline, status: RfqStatus.OPEN, openedAt: new Date(), items: { create: pr.items.map(item => ({ purchaseRequestItemId: item.id, description: item.description, unit: item.unit, quantity: item.quantity })) } }, include: { items: true } });
    await this.audit.record({ organizationId: user.organizationId, actorId: user.id, action: 'CREATE_RFQ', entityType: 'Rfq', entityId: r.id, newValue: { status: r.status, number: r.number } });
    if (r.responseDeadline) {
      const delay = Math.max(0, r.responseDeadline.getTime() - Date.now() - 24 * 60 * 60 * 1000);
      try { await this.jobs.enqueueRfqDeadlineReminder({ organizationId: user.organizationId, rfqId: r.id, userId: user.id }, delay); } catch { /* background reminder is non-blocking */ }
    }
    return serializeBigInt(r);
  }
  async createQuote(user: AuthUser, rfqId: string, body: any) {
    if (![Role.PROCUREMENT, Role.ADMIN] .includes(user.role as any)) throw new ForbiddenException();
    const rfq = await this.prisma.rfq.findFirst({ where: { id: rfqId, organizationId: user.organizationId }, include: { items: true } });
    if (!rfq || rfq.status !== RfqStatus.OPEN) throw new BadRequestException('RFQ is not open');
    if (rfq.responseDeadline && rfq.responseDeadline.getTime() <= Date.now()) throw new BadRequestException('RFQ response deadline has passed');
    const vendor = await this.prisma.vendor.findFirst({ where: { id: body.vendorId, organizationId: user.organizationId, isActive: true } });
    if (!vendor) throw new BadRequestException('Vendor not found in tenant');
    const invitation = await this.prisma.rfqInvitation.findFirst({ where: { rfqId, vendorId: body.vendorId, organizationId: user.organizationId } });
    if (!invitation) throw new BadRequestException('Vendor must be invited to this RFQ before a quote can be recorded');
    const duplicate = await this.prisma.vendorQuote.findFirst({ where: { rfqId, vendorId: body.vendorId, organizationId: user.organizationId } });
    if (duplicate) throw new BadRequestException('This vendor already has a quotation for this RFQ');
    if (!body.items?.length) throw new BadRequestException('Quote needs at least one item');
    const map = new Map(rfq.items.map(i => [i.id, i]));
    const seen = new Set<string>();
    let subtotal = 0;
    const items = body.items.map((item: any) => {
      const rfqItem = map.get(item.rfqItemId); if (!rfqItem) throw new BadRequestException('Quote contains item outside RFQ');
      if (seen.has(rfqItem.id)) throw new BadRequestException('Each RFQ line may appear only once in a quotation');
      seen.add(rfqItem.id);
      const qty = Number(item.quantity); const unitPrice = Math.round(Number(item.unitPrice) * 100); if (qty !== Number(rfqItem.quantity) || unitPrice < 0 || !Number.isFinite(unitPrice)) throw new BadRequestException(`Quotation must cover the full requested quantity for ${rfqItem.description}`);
      subtotal += Math.round(qty * unitPrice);
      return { rfqItemId: rfqItem.id, purchaseRequestItemId: rfqItem.purchaseRequestItemId, description: rfqItem.description, unit: rfqItem.unit, quantity: qty, unitPriceCents: unitPrice };
    });
    if (seen.size !== rfq.items.length) throw new BadRequestException('Quotation must include every RFQ line item');
    const referenceNumber = String(body.referenceNumber ?? `QUOTE-${Date.now()}`).trim();
    if (!referenceNumber) throw new BadRequestException('Quote reference number is required');
    const leadTimeDays = body.leadTimeDays === undefined || body.leadTimeDays === null || body.leadTimeDays === '' ? null : Number(body.leadTimeDays);
    if (leadTimeDays !== null && (!Number.isInteger(leadTimeDays) || leadTimeDays < 0)) throw new BadRequestException('Lead time must be a non-negative whole number of days');
    const taxAmount = Number(body.tax ?? 0);
    if (!Number.isFinite(taxAmount) || taxAmount < 0) throw new BadRequestException('Invalid quote tax');
    const validUntil = body.validUntil ? new Date(body.validUntil) : undefined;
    if (validUntil && (Number.isNaN(validUntil.getTime()) || validUntil.getTime() <= Date.now())) throw new BadRequestException('Quote validity must be a future date');
    try {
    const q = await this.prisma.vendorQuote.create({ data: { organizationId: user.organizationId, rfqId, vendorId: vendor.id, createdById: user.id, referenceNumber, status: QuoteStatus.SUBMITTED, leadTimeDays, paymentTerms: body.paymentTerms, validUntil, notes: body.notes, subtotalCents: subtotal, taxCents: Math.round(taxAmount * 100), totalCents: subtotal + Math.round(taxAmount * 100), items: { create: items } }, include: { vendor: true, items: true } });
    await this.prisma.rfqInvitation.update({ where: { id: invitation.id }, data: { status: 'RESPONDED', respondedAt: new Date() } });
    await this.audit.record({ organizationId: user.organizationId, actorId: user.id, action: 'RECORD_VENDOR_QUOTE', entityType: 'VendorQuote', entityId: q.id, newValue: { status: q.status, totalCents: q.totalCents.toString() } });
    return serializeBigInt(q);
    } catch (error) {
      if ((error as any)?.code === 'P2002') throw new ConflictException('Quote reference number already exists in this organization or vendor quote already exists for this RFQ');
      throw error;
    }
  }
  async selectQuote(user: AuthUser, rfqId: string, quoteId: string, rationale?: string) {
    if (![Role.PROCUREMENT, Role.ADMIN] .includes(user.role as any)) throw new ForbiddenException();
    const quote = await this.prisma.vendorQuote.findFirst({ where: { id: quoteId, rfqId, organizationId: user.organizationId, status: { in: [QuoteStatus.SUBMITTED, QuoteStatus.SELECTED] } }, include: { vendor: true } });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.validUntil && quote.validUntil.getTime() < Date.now()) throw new BadRequestException('Quote is expired');
    const rfq = await this.prisma.rfq.findFirst({ where: { id: rfqId, organizationId: user.organizationId } });
    if (!rfq || rfq.status !== RfqStatus.OPEN) throw new BadRequestException('RFQ is not open');
    const result = await this.prisma.$transaction(async tx => {
      await tx.vendorQuote.updateMany({ where: { rfqId, organizationId: user.organizationId, id: { not: quoteId }, status: QuoteStatus.SUBMITTED }, data: { status: QuoteStatus.REJECTED } });
      await tx.vendorQuote.update({ where: { id: quoteId }, data: { status: QuoteStatus.SELECTED } });
      return tx.rfq.update({ where: { id: rfqId }, data: { selectedQuoteId: quoteId, status: RfqStatus.CLOSED, closedAt: new Date() }, include: { quotes: { include: { vendor: true, items: true } } } });
    });
    await this.audit.record({ organizationId: user.organizationId, actorId: user.id, action: 'SELECT_VENDOR_QUOTE', entityType: 'Rfq', entityId: rfqId, newValue: { selectedQuoteId: quoteId, vendorId: quote.vendorId, rationale } });
    return serializeBigInt(result);
  }
}

