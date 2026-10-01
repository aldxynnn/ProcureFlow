import { Module } from '@nestjs/common';
import { PurchaseRequestsController } from './purchase-requests.controller';
import { PurchaseRequestsService } from './purchase-requests.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { JobsModule } from '../jobs/jobs.module';
@Module({ imports: [AuditModule, NotificationsModule, JobsModule], controllers: [PurchaseRequestsController], providers: [PurchaseRequestsService], exports: [PurchaseRequestsService] })
export class PurchaseRequestsModule {}
