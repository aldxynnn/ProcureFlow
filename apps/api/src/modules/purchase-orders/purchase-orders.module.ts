import { Module } from '@nestjs/common';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { AuditModule } from '../audit/audit.module';
@Module({ imports: [AuditModule], controllers: [PurchaseOrdersController], providers: [PurchaseOrdersService], exports: [PurchaseOrdersService] })
export class PurchaseOrdersModule {}
