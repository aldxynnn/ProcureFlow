import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaService } from '../../common/database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private queue!: Queue;
  private worker!: Worker;
  private connection: any;
  constructor(private readonly config: ConfigService, private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}
  onModuleInit() {
    this.connection = new IORedis(this.config.getOrThrow<string>('REDIS_URL'), { maxRetriesPerRequest: null });
    this.queue = new Queue('procureflow', { connection: this.connection });
    this.worker = new Worker('procureflow', async (job: Job) => this.process(job), { connection: this.connection, concurrency: 4 });
    this.worker.on('failed', (job, err) => this.logger.error(`Job ${job?.id} failed: ${err.message}`));
  }
  async onModuleDestroy() { await this.worker?.close(); await this.queue?.close(); await this.connection?.quit(); }
  async enqueueApprovalReminder(data: { organizationId: string; requestId: string; userId: string }, delay = 86400000) { return this.queue.add('approval-reminder', data, { delay, removeOnComplete: 100, removeOnFail: 100 }); }
  async enqueueRfqDeadlineReminder(data: { organizationId: string; rfqId: string; userId: string }, delay = 3600000) { return this.queue.add('rfq-deadline-reminder', data, { delay, removeOnComplete: 100, removeOnFail: 100 }); }
  private async process(job: Job) {
    if (job.name === 'approval-reminder') {
      const data = job.data as any;
      const request = await this.prisma.purchaseRequest.findFirst({ where: { id: data.requestId, organizationId: data.organizationId, status: 'PENDING_APPROVAL' }, include: { requester: true } });
      if (request) await this.notifications.notify({ organizationId: data.organizationId, userId: data.userId, type: 'APPROVAL_REQUESTED', title: 'Approval reminder', body: `${request.title} is still waiting for approval.` });
    }
    if (job.name === 'rfq-deadline-reminder') {
      const data = job.data as any;
      const rfq = await this.prisma.rfq.findFirst({ where: { id: data.rfqId, organizationId: data.organizationId, status: 'OPEN' } });
      if (rfq) await this.notifications.notify({ organizationId: data.organizationId, userId: data.userId, type: 'RFQ_DEADLINE', title: 'RFQ deadline approaching', body: `${rfq.number} is approaching its response deadline.` });
    }
  }
}
