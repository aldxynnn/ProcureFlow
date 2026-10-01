import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}
  async notify(input: { organizationId: string; userId: string; type: NotificationType; title: string; body: string }) { return this.prisma.notification.create({ data: input }); }
  list(organizationId: string, userId: string) { return this.prisma.notification.findMany({ where: { organizationId, userId }, orderBy: { createdAt: 'desc' }, take: 100 }); }
  async read(organizationId: string, userId: string, id: string) { return this.prisma.notification.updateMany({ where: { id, organizationId, userId, readAt: null }, data: { readAt: new Date() } }); }
}
