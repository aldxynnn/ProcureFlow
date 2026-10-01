import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { PurchaseRequestsService } from './purchase-requests.service';
import { Role } from '@prisma/client';

describe('PurchaseRequestsService', () => {
  const prisma: any = {
    department: { findFirst: jest.fn() }, budget: { findFirst: jest.fn() }, purchaseRequest: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() }, approval: { create: jest.fn() }, $transaction: jest.fn(),
  };
  const audit: any = { record: jest.fn() };
  const notifications: any = { notify: jest.fn() };
  const jobs: any = { enqueueApprovalReminder: jest.fn() };
  const service = new PurchaseRequestsService(prisma, audit, notifications, jobs);
  beforeEach(() => jest.clearAllMocks());

  it('rejects self-approval', async () => {
    prisma.purchaseRequest.findFirst.mockResolvedValue({ id: 'pr1', organizationId: 'org1', requesterId: 'u1', status: 'PENDING_APPROVAL', requester: { id: 'u1', managerId: 'u2' } });
    await expect(service.approveOrReject({ id:'u1', organizationId:'org1', role:Role.MANAGER, name:'A', email:'a' }, 'pr1', 'APPROVED' as any)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires rejection reason', async () => {
    prisma.purchaseRequest.findFirst.mockResolvedValue({ id: 'pr1', organizationId: 'org1', requesterId: 'u1', status: 'PENDING_APPROVAL', requester: { id: 'u1', managerId: 'u2' } });
    await expect(service.approveOrReject({ id:'u2', organizationId:'org1', role:Role.MANAGER, name:'M', email:'m' }, 'pr1', 'REJECTED' as any)).rejects.toBeInstanceOf(BadRequestException);
  });
});
