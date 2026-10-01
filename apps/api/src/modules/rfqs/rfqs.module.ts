import { Module } from '@nestjs/common';
import { RfqsController } from './rfqs.controller';
import { RfqsService } from './rfqs.service';
import { AuditModule } from '../audit/audit.module';
import { JobsModule } from '../jobs/jobs.module';
@Module({ imports: [AuditModule, JobsModule], controllers: [RfqsController], providers: [RfqsService], exports: [RfqsService] })
export class RfqsModule {}
