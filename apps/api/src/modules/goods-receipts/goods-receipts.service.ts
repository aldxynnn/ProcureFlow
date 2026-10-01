import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../../common/auth/types';
import { Role, PurchaseOrderStatus } from '@prisma/client';
import { serializeBigInt } from '../../common/utils/bigint';
import { randomUUID } from 'node:crypto';

@Injectable()
export class GoodsReceiptsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}
  async create(user: AuthUser, poId: string, body: any) {
    if (![Role.PROCUREMENT, Role.ADMIN] .includes(user.role as any)) throw new ForbiddenException();
    const result = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "PurchaseOrder" WHERE id = ${poId} AND "organizationId" = ${user.organizationId} FOR UPDATE`;
      const po = await tx.purchaseOrder.findFirst({ where: { id: poId, organizationId: user.organizationId }, include: { items: true } });
      if (!po) throw new NotFoundException('PO not found');
      if (![PurchaseOrderStatus.ISSUED, PurchaseOrderStatus.PARTIALLY_RECEIVED] .includes(po.status as any)) throw new BadRequestException('PO is not receivable');
      if (!body.items?.length) throw new BadRequestException('Receipt needs items');
      const quantities = new Map<string, number>();
      for (const input of body.items) {
        const item = po.items.find(i => i.id === input.purchaseOrderItemId);
        if (!item) throw new BadRequestException('Receipt item is outside this PO');
        const qty = Number(input.quantityReceived);
        if (!Number.isFinite(qty) || qty <= 0) throw new BadRequestException(`Invalid receipt quantity for ${item.description}`);
        const totalForLine = (quantities.get(item.id) ?? 0) + qty;
        const remaining = Number(item.quantityOrdered) - Number(item.quantityReceived);
        if (totalForLine > remaining) throw new BadRequestException(`Receipt quantity exceeds remaining quantity for ${item.description}`);
        quantities.set(item.id, totalForLine);
      }
      const receiptItems = [...quantities.entries()].map(([purchaseOrderItemId, quantityReceived]) => ({ purchaseOrderItemId, quantityReceived }));
      const receiptNumber = body.receiptNumber?.trim() || `GR-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
      const receivedAt = body.receivedAt ? new Date(body.receivedAt) : new Date();
      if (Number.isNaN(receivedAt.getTime()) || receivedAt.getTime() > Date.now() + 24 * 60 * 60 * 1000) throw new BadRequestException('Invalid goods receipt date');
      let receipt;
      try {
        receipt = await tx.goodsReceipt.create({ data: { organizationId: user.organizationId, purchaseOrderId: poId, receiptNumber, receivedAt, note: body.note, items: { create: receiptItems } }, include: { items: true } });
      } catch (error) { if ((error as any)?.code === 'P2002') throw new ConflictException('Receipt number already exists in this organization'); throw error; }
      for (const ri of receiptItems) await tx.purchaseOrderItem.update({ where: { id: ri.purchaseOrderItemId }, data: { quantityReceived: { increment: ri.quantityReceived } } });
      const refreshed = await tx.purchaseOrder.findUniqueOrThrow({ where: { id: poId }, include: { items: true } });
      const fully = refreshed.items.every(i => Number(i.quantityReceived) >= Number(i.quantityOrdered));
      const status = fully ? PurchaseOrderStatus.FULLY_RECEIVED : PurchaseOrderStatus.PARTIALLY_RECEIVED;
      const updatedPo = await tx.purchaseOrder.update({ where: { id: poId }, data: { status }, include: { items: true } });
      return { receipt, updatedPo };
    });
    await this.audit.record({ organizationId: user.organizationId, actorId: user.id, action: 'CREATE_GOODS_RECEIPT', entityType: 'PurchaseOrder', entityId: poId, newValue: { receiptId: result.receipt.id, receiptNumber: result.receipt.receiptNumber, status: result.updatedPo.status } });
    return serializeBigInt(result);
  }
}

