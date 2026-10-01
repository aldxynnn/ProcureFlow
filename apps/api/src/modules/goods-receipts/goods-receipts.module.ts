import { Module } from '@nestjs/common';
import { GoodsReceiptsController } from './goods-receipts.controller';
import { GoodsReceiptsService } from './goods-receipts.service';
import { AuditModule } from '../audit/audit.module';
@Module({ imports: [AuditModule], controllers: [GoodsReceiptsController], providers: [GoodsReceiptsService], exports: [GoodsReceiptsService] })
export class GoodsReceiptsModule {}
