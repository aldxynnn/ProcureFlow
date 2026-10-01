import { BadRequestException } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { Role } from '@prisma/client';

describe('PurchaseOrdersService', () => {
  const audit: any = { record: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not allow a new PO to consume budget already realized as verified spend', async () => {
    const tx: any = {
      $queryRaw: jest.fn(),
      purchaseOrder: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      budget: {
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
    };

    const prisma: any = {
      $transaction: jest.fn(async (fn: any) => fn(tx)),
    };

    const service = new PurchaseOrdersService(prisma, audit);

    tx.purchaseOrder.findFirst.mockResolvedValue({
      id: 'po1',
      organizationId: 'org1',
      status: 'DRAFT',
      approvedAt: new Date(),
      totalCents: 5000,
      sourceQuote: {
        rfq: {
          purchaseRequest: {
            budgetId: 'budget1',
            budget: {
              id: 'budget1',
            },
          },
        },
      },
    });

    tx.budget.findUniqueOrThrow.mockResolvedValue({
      id: 'budget1',
      allocatedCents: 10000,
      committedCents: 0,
      verifiedCents: 6000,
    });

    const user = {
      id: 'u1',
      organizationId: 'org1',
      role: Role.PROCUREMENT,
      name: 'Procurement User',
      email: 'procurement@example.com',
    };

    await expect(
      service.issue(user, 'po1'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.budget.update).not.toHaveBeenCalled();
    expect(tx.purchaseOrder.update).not.toHaveBeenCalled();
  });
});
