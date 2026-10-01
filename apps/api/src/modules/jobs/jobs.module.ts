import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { NotificationsModule } from '../notifications/notifications.module';
@Module({ imports: [NotificationsModule], providers: [JobsService], exports: [JobsService] })
export class JobsModule {}
