import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JobsService } from '../jobs/jobs.service';
import { AuthUser } from '../../common/auth/types';
import { Role, PurchaseRequestStatus, ApprovalDecision, NotificationType, Prisma } from '@prisma/client';
import { serializeBigInt } from '../../common/utils/bigint';

@Injectable()
export class PurchaseRequestsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly notifications: NotificationsService, private readonly jobs: JobsService) {}

  async list(user: AuthUser, status?: PurchaseRequestStatus) {
    const where: Prisma.PurchaseRequestWhereInput = { organizationId: user.organizationId, ...(status ? { status } : {}) };
    if (user.role === Role.EMPLOYEE) where.requesterId = user.id;
    if (user.role === Role.MANAGER) where.OR = [{ requesterId: user.id }, { requester: { managerId: user.id } }];
    if (user.role === Role.PROCUREMENT) where.status = PurchaseRequestStatus.APPROVED;
    const rows = await this.prisma.purchaseRequest.findMany({ where, include: { department: true, requester: { select: { id: true, name: true, email: true, role: true } }, items: true, budget: true, rfqs: { select: { id: true, status: true, number: true } } }, orderBy: { createdAt: 'desc' }, take: 100 });
    return serializeBigInt(rows);
  }

  async get(user: AuthUser, id: string) {
    const request = await this.prisma.purchaseRequest.findFirst({ where: { id, organizationId: user.organizationId }, include: { department: true, requester: { include: { manager: true } }, items: true, approvals: { include: { approver: { select: { id: true, name: true, role: true } }, }, orderBy: { decidedAt: 'desc' } }, budget: true, rfqs: { select: { id: true, number: true, title: true, status: true } } } });
    if (!request) throw new NotFoundException('Purchase request not found');
    if (user.role === Role.EMPLOYEE && request.requesterId !== user.id) throw new ForbiddenException();
    if (user.role === Role.MANAGER && request.requesterId !== user.id && request.requester.managerId !== user.id) throw new ForbiddenException();
    if (user.role === Role.PROCUREMENT && request.status !== PurchaseRequestStatus.APPROVED) throw new ForbiddenException('Only approved purchase requests are available to Procurement');
    return serializeBigInt(request);
  }

  async create(user: AuthUser, body: any) {
    if (user.role !== Role.EMPLOYEE) throw new ForbiddenException();
    const title = body.title?.trim();
    const justification = body.justification?.trim();
    if (!title) throw new BadRequestException('Request title is required');
    if (!justification) throw new BadRequestException('Business justification is required');
    if (!Array.isArray(body.items) || body.items.length === 0) throw new BadRequestException('At least one item is required');
    const department = await this.prisma.department.findFirst({ where: { id: body.departmentId, organizationId: user.organizationId } });
    if (!department) throw new BadRequestException('Department is outside the current organization');
    if (user.role === Role.EMPLOYEE && user.departmentId && user.departmentId !== department.id) throw new ForbiddenException('Employees can only request for their own department');
    const budget = body.budgetId ? await this.prisma.budget.findFirst({ where: { id: body.budgetId, organizationId: user.organizationId } }) : null;
    if (body.budgetId && !budget) throw new BadRequestException('Budget not found in tenant');
    if (budget?.departmentId && budget.departmentId !== department.id) throw new BadRequestException('Selected budget belongs to a different department');
    const neededBy = body.neededBy ? new Date(body.neededBy) : undefined;
    if (neededBy && Number.isNaN(neededBy.getTime())) throw new BadRequestException('Invalid needed-by date');
    if (neededBy && neededBy.getTime() < Date.now()) throw new BadRequestException('Needed-by date cannot be in the past');
    const items = body.items.map((item:any) => {
      const description=item.description?.trim(); const unit=item.unit?.trim(); const quantity=Number(item.quantity); const price=Number(item.estimatedUnitPrice);
      if (!description || !unit) throw new BadRequestException('Every request item needs a description and unit');
      if (!Number.isFinite(quantity) || quantity <= 0) throw new BadRequestException(`Invalid quantity for ${description}`);
      if (!Number.isFinite(price) || price < 0) throw new BadRequestException(`Invalid estimated unit price for ${description}`);
      return { description, unit, quantity, estimatedUnitPriceCents: BigInt(Math.round(price * 100)), notes:item.notes?.trim() || undefined };
    });
    const request = await this.prisma.purchaseRequest.create({ data: { organizationId: user.organizationId, departmentId: department.id, budgetId: budget?.id, requesterId: user.id, title, justification, neededBy, items: { create: items } }, include: { items: true } });
    await this.audit.record({ organizationId: user.organizationId, actorId: user.id, action: 'CREATE_PURCHASE_REQUEST', entityType: 'PurchaseRequest', entityId: request.id, newValue: { status: request.status, title: request.title } });
    return serializeBigInt(request);
  }

  async submit(user: AuthUser, id: string) {
    const request = await this.getForMutation(user, id);
    if (request.requesterId !== user.id) throw new ForbiddenException('Only the requester can submit this request');
    if (request.status !== 'DRAFT') throw new BadRequestException('Only drafts can be submitted');
    const target = request.requester.managerId;
    if (!target) throw new BadRequestException('Requester has no assigned manager');
    const submittedAt = new Date();
    const updated = await this.prisma.purchaseRequest.update({ where: { id: request.id }, data: { status: PurchaseRequestStatus.PENDING_APPROVAL, submittedAt }, include: { requester: true, items: true } });
    await this.audit.record({ organizationId: user.organizationId, actorId: user.id, action: 'SUBMIT_PURCHASE_REQUEST', entityType: 'PurchaseRequest', entityId: id, oldValue: { status: request.status }, newValue: { status: PurchaseRequestStatus.PENDING_APPROVAL, submittedAt } });
    await this.notifications.notify({ organizationId: user.organizationId, userId: target, type: NotificationType.APPROVAL_REQUESTED, title: 'Purchase request needs approval', body: `${request.title} is waiting for your review.` });
    try { await this.jobs.enqueueApprovalReminder({ organizationId: user.organizationId, requestId: id, userId: target }); } catch { /* background reminder is non-blocking */ }
    return serializeBigInt(updated);
  }

  async approveOrReject(user: AuthUser, id: string, decision: ApprovalDecision, comment?: string) {
    if (user.role !== Role.MANAGER && user.role !== Role.ADMIN) throw new ForbiddenException('Only manager/admin can decide approvals');
    const request = await this.prisma.purchaseRequest.findFirst({ where: { id, organizationId: user.organizationId }, include: { requester: true } });
    if (!request) throw new NotFoundException('Purchase request not found');
    if (request.status !== PurchaseRequestStatus.PENDING_APPROVAL) throw new BadRequestException('Request is not pending approval');
    if (request.requesterId === user.id) throw new ForbiddenException('Requester cannot approve their own request');
    if (user.role === Role.MANAGER && request.requester.managerId !== user.id) throw new ForbiddenException('Request is outside manager scope');
    if (decision === ApprovalDecision.REJECTED && !comment?.trim()) throw new BadRequestException('Rejection reason is required');

    const newStatus = decision === ApprovalDecision.APPROVED ? PurchaseRequestStatus.APPROVED : PurchaseRequestStatus.REJECTED;
    const result = await this.prisma.$transaction(async tx => {
        const current = await tx.purchaseRequest.findFirst({ where: { id, organizationId: user.organizationId } });
        if (!current || current.status !== PurchaseRequestStatus.PENDING_APPROVAL) throw new BadRequestException('Approval state changed; refresh and retry');
        await tx.approval.create({ data: { organizationId: user.organizationId, purchaseRequestId: id, approverId: user.id, decision, comment } });
        return tx.purchaseRequest.update({ where: { id }, data: { status: newStatus, approvedAt: decision === ApprovalDecision.APPROVED ? new Date() : undefined, rejectedAt: decision === ApprovalDecision.REJECTED ? new Date() : undefined, rejectionReason: decision === ApprovalDecision.REJECTED ? comment : null } });
      });
    await this.audit.record({ organizationId: user.organizationId, actorId: user.id, action: decision === 'APPROVED' ? 'APPROVE_PURCHASE_REQUEST' : 'REJECT_PURCHASE_REQUEST', entityType: 'PurchaseRequest', entityId: id, oldValue: { status: request.status }, newValue: { status: newStatus, comment } });
    await this.notifications.notify({ organizationId: user.organizationId, userId: request.requesterId, type: NotificationType.APPROVAL_DECIDED, title: `Purchase request ${decision.toLowerCase()}`, body: `${request.title} was ${decision.toLowerCase()}.` });
    return result;
  }

  async cancel(user: AuthUser, id: string) {
    const request = await this.getForMutation(user, id);
    if (request.requesterId !== user.id) throw new ForbiddenException('Only the requester can cancel this request');
    if (![PurchaseRequestStatus.DRAFT, PurchaseRequestStatus.SUBMITTED, PurchaseRequestStatus.PENDING_APPROVAL] .includes(request.status as any)) throw new BadRequestException('Request can no longer be cancelled');
    const updated = await this.prisma.purchaseRequest.update({ where: { id }, data: { status: PurchaseRequestStatus.CANCELLED, cancelledAt: new Date() } });
    await this.audit.record({ organizationId: user.organizationId, actorId: user.id, action: 'CANCEL_PURCHASE_REQUEST', entityType: 'PurchaseRequest', entityId: id, oldValue: { status: request.status }, newValue: { status: updated.status } });
    return updated;
  }

  private async getForMutation(user: AuthUser, id: string) {
    const r = await this.prisma.purchaseRequest.findFirst({ where: { id, organizationId: user.organizationId }, include: { requester: true, items: true } });
    if (!r) throw new NotFoundException('Purchase request not found');
    if (user.role === Role.EMPLOYEE && r.requesterId !== user.id) throw new ForbiddenException();
    if (user.role === Role.MANAGER && r.requesterId !== user.id && r.requester.managerId !== user.id) throw new ForbiddenException();
    return r;
  }
}

