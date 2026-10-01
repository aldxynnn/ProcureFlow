import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

function jsonSafe(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value && 'toJSON' in value && typeof (value as { toJSON?: unknown }).toJSON === 'function') {
    return jsonSafe((value as { toJSON(): unknown }).toJSON());
  }
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => [key, jsonSafe(child)]));
  return value;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: { organizationId: string; actorId?: string; action: string; entityType: string; entityId: string; oldValue?: unknown; newValue?: unknown; metadata?: unknown }) {
    return this.prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        oldValueJson: jsonSafe(input.oldValue) as any,
        newValueJson: jsonSafe(input.newValue) as any,
        metadataJson: jsonSafe(input.metadata) as any,
      },
    });
  }

  list(organizationId: string, entityType?: string, entityId?: string) {
    return this.prisma.auditLog.findMany({ where: { organizationId, ...(entityType ? { entityType } : {}), ...(entityId ? { entityId } : {}) }, include: { actor: { select: { id: true, name: true, email: true, role: true } } }, orderBy: { createdAt: 'desc' }, take: 200 });
  }
}
