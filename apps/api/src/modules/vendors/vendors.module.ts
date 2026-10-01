import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';
@Module({ imports: [AuditModule], controllers: [VendorsController], providers: [VendorsService], exports: [VendorsService] })
export class VendorsModule {}
