import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsDateString, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/types';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';
import { InvoicesService } from './invoices.service';
class InvoiceItemDto { @IsString() purchaseOrderItemId!: string; @IsNumber() @Min(0.0001) quantityInvoiced!: number; @IsNumber() @Min(0) unitPrice!: number; }
class CreateInvoiceDto { @IsString() purchaseOrderId!: string; @IsOptional() @IsString() vendorId?: string; @IsOptional() @IsString() budgetId?: string; @IsString() invoiceNumber!: string; @IsDateString() invoiceDate!: string; @IsOptional() @IsNumber() @Min(0) tax?: number; @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => InvoiceItemDto) items!: InvoiceItemDto[]; }
class RejectInvoiceDto { @IsString() reason!: string; }
@ApiTags('invoices') @ApiBearerAuth() @UseGuards(JwtGuard, RolesGuard) @Controller('api/invoices')
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}
  @Get() @Roles(Role.FINANCE, Role.PROCUREMENT, Role.ADMIN) list(@CurrentUser() user: AuthUser) { return this.service.list(user); }
  @Get(':id') @Roles(Role.FINANCE, Role.PROCUREMENT, Role.ADMIN) get(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.get(user, id); }
  @Post() @Roles(Role.FINANCE, Role.PROCUREMENT, Role.ADMIN) create(@CurrentUser() user: AuthUser, @Body() body: CreateInvoiceDto) { return this.service.create(user, body); }
  @Post(':id/verify') @Roles(Role.FINANCE, Role.ADMIN) verify(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.verify(user, id); }
  @Post(':id/approve') @Roles(Role.FINANCE, Role.ADMIN) approve(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.approve(user, id); }
  @Post(':id/reject') @Roles(Role.FINANCE, Role.ADMIN) reject(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: RejectInvoiceDto) { return this.service.reject(user, id, body.reason); }
}
