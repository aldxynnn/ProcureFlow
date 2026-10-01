import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/types';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';
import { PurchaseOrdersService } from './purchase-orders.service';

@ApiTags('purchase-orders') @ApiBearerAuth() @UseGuards(JwtGuard, RolesGuard) @Controller('api/purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly service: PurchaseOrdersService) {}
  @Get() @Roles(Role.MANAGER, Role.PROCUREMENT, Role.FINANCE, Role.ADMIN) list(@CurrentUser() user: AuthUser) { return this.service.list(user); }
  @Get(':id') @Roles(Role.MANAGER, Role.PROCUREMENT, Role.FINANCE, Role.ADMIN) get(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.get(user, id); }
  @Post('/from-quote/:quoteId') @Roles(Role.PROCUREMENT, Role.ADMIN) create(@CurrentUser() user: AuthUser, @Param('quoteId') quoteId: string) { return this.service.createFromQuote(user, quoteId); }
  @Post(':id/approve') @Roles(Role.MANAGER, Role.FINANCE, Role.ADMIN) approve(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.approve(user, id); }
  @Post(':id/issue') @Roles(Role.PROCUREMENT, Role.ADMIN) issue(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.issue(user, id); }
}
