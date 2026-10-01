import { BadRequestException } from '@nestjs/common';
import { GoodsReceiptsService } from './goods-receipts.service';
import { Role } from '@prisma/client';

describe('GoodsReceiptsService', () => {
  const tx = { $queryRaw: jest.fn(), purchaseOrder: { findFirst: jest.fn(), update: jest.fn() }, goodsReceipt: { create: jest.fn() }, purchaseOrderItem: { update: jest.fn() } };
  const prisma: any = { $transaction: jest.fn(async (fn:any) => fn(tx)) };
  const audit: any = { record: jest.fn() };
  const service = new GoodsReceiptsService(prisma, audit);
  beforeEach(() => jest.clearAllMocks());

  it('does not allow receiving beyond remaining quantity', async () => {
    tx.$queryRaw.mockResolvedValue([]);
    tx.purchaseOrder.findFirst.mockResolvedValue({ id:'po1', organizationId:'org1', status:'ISSUED', items:[{ id:'poi1', description:'Laptop', quantityOrdered:10, quantityReceived:8 }] });
    await expect(service.create({ id:'u1',organizationId:'org1',role:Role.PROCUREMENT,name:'P',email:'p' }, 'po1', { items:[{ purchaseOrderItemId:'poi1', quantityReceived:3 }] })).rejects.toBeInstanceOf(BadRequestException);
  });
});
