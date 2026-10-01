import { BadRequestException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { Role } from '@prisma/client';

describe('InvoicesService', () => {
  const audit: any = { record: jest.fn() };
  const notifications: any = { notify: jest.fn() };

  it('blocks approval when invoice is not verified', async () => {
    const prisma: any = {
      invoice: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'i1',
          organizationId: 'o1',
          status: 'DISCREPANCY',
        }),
      },
      $transaction: jest.fn(async (callback: any) =>
        callback({
          invoice: {
            findFirst: jest.fn().mockResolvedValue({
              id: 'i1',
              organizationId: 'o1',
              status: 'DISCREPANCY',
            }),
          },
        }),
      ),
    };

    const service = new InvoicesService(prisma, audit, notifications);

    await expect(
      service.approve(
        {
          id: 'u1',
          organizationId: 'o1',
          role: Role.FINANCE,
          name: 'F',
          email: 'f',
        },
        'i1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});