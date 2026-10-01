import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/types';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ApprovalDecision, PurchaseRequestStatus, Role } from '@prisma/client';
import { PurchaseRequestsService } from './purchase-requests.service';
class RequestItemDto { @IsString() description!: string; @IsString() unit!: string; @IsNumber() @Min(0.0001) quantity!: number; @IsNumber() @Min(0) estimatedUnitPrice!: number; @IsOptional() @IsString() notes?: string; }
class CreateRequestDto { @IsString() departmentId!: string; @IsOptional() @IsString() budgetId?: string; @IsString() title!: string; @IsString() justification!: string; @IsOptional() @IsDateString() neededBy?: string; @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => RequestItemDto) items!: RequestItemDto[]; }
class DecisionDto { @IsEnum(ApprovalDecision) decision!: ApprovalDecision; @IsOptional() @IsString() comment?: string; }
@ApiTags('purchase-requests') @ApiBearerAuth() @UseGuards(JwtGuard, RolesGuard) @Controller('api/purchase-requests')
export class PurchaseRequestsController {
  constructor(private readonly service: PurchaseRequestsService) {}
  @Get() @Roles(Role.EMPLOYEE, Role.MANAGER, Role.PROCUREMENT, Role.ADMIN) list(@CurrentUser() user: AuthUser, @Query('status') status?: PurchaseRequestStatus) { return this.service.list(user, status); }
  @Get(':id') @Roles(Role.EMPLOYEE, Role.MANAGER, Role.PROCUREMENT, Role.ADMIN) get(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.get(user, id); }
  
  @Post() @Roles(Role.EMPLOYEE) create(@CurrentUser() user: AuthUser, @Body() body: CreateRequestDto) { return this.service.create(user, body); }
  @Post(':id/submit') @Roles(Role.EMPLOYEE) submit(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.submit(user, id); }
  @Post(':id/decision') @Roles(Role.MANAGER, Role.ADMIN) decision(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: DecisionDto) { return this.service.approveOrReject(user, id, body.decision, body.comment); }
  @Post(':id/cancel') @Roles(Role.EMPLOYEE) cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.cancel(user, id); }
}
