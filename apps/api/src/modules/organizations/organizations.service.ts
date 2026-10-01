import { ConflictException, ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuthUser } from '../../common/auth/types';
import { Role } from '@prisma/client';
import { hash } from 'bcryptjs';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}
  async get(user: AuthUser) { return this.prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId }, include: { departments: { orderBy: { name: 'asc' } } } }); }
  async rename(user: AuthUser, name: string) {
    if (user.role !== Role.ADMIN) throw new ForbiddenException();
    const normalized = name?.trim();
    if (!normalized) throw new BadRequestException('Organization name is required');
    const before = await this.get(user);
    const updated = await this.prisma.organization.update({ where: { id: user.organizationId }, data: { name: normalized } });
    await this.audit.record({ organizationId:user.organizationId, actorId:user.id, action:'RENAME_ORGANIZATION', entityType:'Organization', entityId:user.organizationId, oldValue:{name:before.name}, newValue:{name:updated.name} });
    return updated;
  }
  async createDepartment(user: AuthUser, body: { name:string; code:string }) {
    if (user.role !== Role.ADMIN) throw new ForbiddenException();
    const name=body.name?.trim(); const code=body.code?.trim().toUpperCase();
    if (!name || !code) throw new BadRequestException('Department name and code are required');
    try {
      const created=await this.prisma.department.create({ data:{organizationId:user.organizationId,name,code} });
      await this.audit.record({organizationId:user.organizationId,actorId:user.id,action:'CREATE_DEPARTMENT',entityType:'Department',entityId:created.id,newValue:{name:created.name,code:created.code}});
      return created;
    } catch (error) { if ((error as any)?.code === 'P2002') throw new ConflictException('Department code already exists in this organization'); throw error; }
  }
  async updateUser(user: AuthUser, id: string, body: { role?: Role; isActive?: boolean; departmentId?: string | null; managerId?: string | null }) {
    if (user.role !== Role.ADMIN) throw new ForbiddenException();
    if (id === user.id && body.isActive === false) throw new ConflictException('The current admin cannot deactivate their own account');
    if (id === user.id && body.role && body.role !== Role.ADMIN) throw new ConflictException('The current admin cannot demote their own account');
    const before = await this.prisma.user.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!before) throw new NotFoundException('User not found');

    const nextRole = body.role ?? before.role;
    const hasDepartmentPatch = Object.prototype.hasOwnProperty.call(body, 'departmentId');
    const hasManagerPatch = Object.prototype.hasOwnProperty.call(body, 'managerId');
    const departmentId = hasDepartmentPatch ? (body.departmentId || null) : before.departmentId;
    const requestedManagerId = hasManagerPatch ? (body.managerId || null) : before.managerId;
    const managerId = nextRole === Role.EMPLOYEE ? requestedManagerId : null;

    if ((nextRole === Role.EMPLOYEE || nextRole === Role.MANAGER) && !departmentId) {
      throw new BadRequestException('Department is required for employees and managers');
    }
    if (nextRole === Role.EMPLOYEE && !managerId) {
      throw new BadRequestException('A manager is required for employees');
    }
    if (nextRole !== Role.EMPLOYEE && hasManagerPatch && managerId) {
      throw new BadRequestException('Only employees can have an assigned manager');
    }
    if (managerId === id) throw new ConflictException('A user cannot manage themselves');

    if (departmentId) {
      const department = await this.prisma.department.findFirst({ where: { id: departmentId, organizationId: user.organizationId } });
      if (!department) throw new ConflictException('Department not found in tenant');
    }
    if (managerId) {
      const manager = await this.prisma.user.findFirst({ where: { id: managerId, organizationId: user.organizationId, isActive: true } });
      if (!manager) throw new ConflictException('Manager not found or inactive in tenant');
      if (manager.role !== Role.MANAGER && manager.role !== Role.ADMIN) throw new ConflictException('Assigned manager must have MANAGER or ADMIN role');
    }

    const reportCount = await this.prisma.user.count({ where: { organizationId: user.organizationId, managerId: id, isActive: true } });
    if (reportCount > 0 && nextRole !== Role.MANAGER && nextRole !== Role.ADMIN) {
      throw new ConflictException('Reassign direct reports before changing this manager to another role');
    }
    if (body.isActive === false && reportCount > 0) {
      throw new ConflictException('Reassign direct reports before deactivating this manager');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(body.role ? { role: nextRole } : {}),
        ...(typeof body.isActive === 'boolean' ? { isActive: body.isActive } : {}),
        ...(hasDepartmentPatch ? { departmentId } : {}),
        ...(hasManagerPatch ? { managerId } : {}),
      },
      select: { id:true,name:true,email:true,role:true,departmentId:true,managerId:true,isActive:true,createdAt:true },
    });
    if (body.isActive === false) await this.prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    await this.audit.record({ organizationId:user.organizationId, actorId:user.id, action:'UPDATE_USER', entityType:'User', entityId:id, oldValue:{role:before.role,isActive:before.isActive,departmentId:before.departmentId,managerId:before.managerId}, newValue:{role:updated.role,isActive:updated.isActive,departmentId:updated.departmentId,managerId:updated.managerId} });
    return updated;
  }

  async createUser(user: AuthUser, body:any) {
    if (user.role !== Role.ADMIN) throw new ForbiddenException();
    const role = body.role as Role;
    if (![Role.EMPLOYEE, Role.MANAGER, Role.PROCUREMENT, Role.FINANCE, Role.ADMIN].includes(role)) throw new BadRequestException('Invalid role');
    if ((role === Role.EMPLOYEE || role === Role.MANAGER) && !body.departmentId) throw new BadRequestException('Department is required for employees and managers');
    if (role !== Role.EMPLOYEE && body.managerId) throw new BadRequestException('Only employees can have an assigned manager');
    if (role === Role.EMPLOYEE && !body.managerId) throw new BadRequestException('A manager is required for employees');
    const department = body.departmentId ? await this.prisma.department.findFirst({where:{id:body.departmentId,organizationId:user.organizationId}}) : null;
    if (body.departmentId && !department) throw new ConflictException('Department not found in tenant');
    const manager = body.managerId ? await this.prisma.user.findFirst({where:{id:body.managerId,organizationId:user.organizationId,isActive:true}}) : null;
    if (body.managerId && !manager) throw new ConflictException('Manager not found in tenant');
    if (manager && manager.role !== Role.MANAGER && manager.role !== Role.ADMIN) throw new ConflictException('Manager must have MANAGER or ADMIN role');
    const passwordHash = await hash(body.password,12);
    try {
      const created = await this.prisma.user.create({ data:{organizationId:user.organizationId,departmentId:body.departmentId,managerId:body.managerId,name:body.name.trim(),email:body.email.toLowerCase().trim(),passwordHash,role}, select:{id:true,name:true,email:true,role:true,departmentId:true,managerId:true,isActive:true,createdAt:true} });
      await this.audit.record({organizationId:user.organizationId,actorId:user.id,action:'CREATE_USER',entityType:'User',entityId:created.id,newValue:{email:created.email,role:created.role}});
      return created;
    } catch (error) { if ((error as any)?.code === 'P2002') throw new ConflictException('User email already exists in this organization'); throw error; }
  }
}
