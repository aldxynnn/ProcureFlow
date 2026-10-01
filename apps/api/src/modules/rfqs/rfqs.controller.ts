import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsArray, IsDateString, IsNumber, IsOptional, IsString, Min, ArrayMinSize } from 'class-validator';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/types';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';
import { RfqsService } from './rfqs.service';
class CreateRfqDto { @IsString() purchaseRequestId!: string; @IsOptional() @IsString() title?: string; @IsOptional() @IsDateString() responseDeadline?: string; }
class InviteVendorsDto { @IsArray() @ArrayMinSize(1) @IsString({ each: true }) vendorIds!: string[]; }
class QuoteItemDto { @IsString() rfqItemId!: string; @IsNumber() @Min(0.0001) quantity!: number; @IsNumber() @Min(0) unitPrice!: number; }
class QuoteDto { @IsString() vendorId!: string; @IsOptional() @IsString() referenceNumber?: string; @IsOptional() @IsNumber() @Min(0) leadTimeDays?: number; @IsOptional() @IsString() paymentTerms?: string; @IsOptional() @IsDateString() validUntil?: string; @IsOptional() @IsNumber() @Min(0) tax?: number; @IsOptional() @IsString() notes?: string; @IsArray() @ArrayMinSize(1) items!: QuoteItemDto[]; }
class SelectQuoteDto { @IsOptional() @IsString() rationale?: string; }
@ApiTags('rfqs') @ApiBearerAuth() @UseGuards(JwtGuard, RolesGuard) @Controller('api/rfqs')
export class RfqsController {
  constructor(private readonly service: RfqsService) {}
  @Get() @Roles(Role.PROCUREMENT, Role.ADMIN) list(@CurrentUser() user: AuthUser) { return this.service.list(user); }
  @Get(':id') @Roles(Role.PROCUREMENT, Role.ADMIN) get(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.get(user, id); }
  @Post() @Roles(Role.PROCUREMENT, Role.ADMIN) create(@CurrentUser() user: AuthUser, @Body() body: CreateRfqDto) { return this.service.create(user, body); }
  @Post(':id/invitations') @Roles(Role.PROCUREMENT, Role.ADMIN) invite(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: InviteVendorsDto) { return this.service.inviteVendors(user, id, body.vendorIds); }
  @Post(':id/quotes') @Roles(Role.PROCUREMENT, Role.ADMIN) quote(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: QuoteDto) { return this.service.createQuote(user, id, body); }
  @Post(':id/select/:quoteId') @Roles(Role.PROCUREMENT, Role.ADMIN) select(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('quoteId') quoteId: string, @Body() body: SelectQuoteDto) { return this.service.selectQuote(user, id, quoteId, body.rationale); }
}
