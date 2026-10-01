import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/types';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';
import { AuditService } from './audit.service';
@ApiTags('audit') @ApiBearerAuth() @UseGuards(JwtGuard, RolesGuard) @Controller('api/audit')
export class AuditController { constructor(private readonly audit: AuditService) {} @Get() @Roles(Role.ADMIN, Role.MANAGER, Role.PROCUREMENT, Role.FINANCE) list(@CurrentUser() user: AuthUser, @Query('entityType') entityType?: string, @Query('entityId') entityId?: string) { return this.audit.list(user.organizationId, entityType, entityId); } }
