import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { CoreModule } from './common/core.module';
import { AuthModule } from './modules/auth/auth.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { PurchaseRequestsModule } from './modules/purchase-requests/purchase-requests.module';
import { RfqsModule } from './modules/rfqs/rfqs.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { GoodsReceiptsModule } from './modules/goods-receipts/goods-receipts.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { SetupModule } from './modules/setup/setup.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CoreModule,
    JwtModule.registerAsync({ global: true, inject: [ConfigService], useFactory: (config: ConfigService) => ({ secret: config.getOrThrow<string>('JWT_SECRET'), signOptions: {
  expiresIn: (config.get<string>('ACCESS_TOKEN_TTL') ?? '15m') as any
} }) }),
    AuthModule,
    VendorsModule,
    PurchaseRequestsModule,
    RfqsModule,
    PurchaseOrdersModule,
    GoodsReceiptsModule,
    InvoicesModule,
    BudgetsModule,
    NotificationsModule,
    AuditModule,
    DashboardModule,
    AttachmentsModule,
    JobsModule,
    OrganizationsModule,
    SetupModule
  ]
})
export class AppModule {}
