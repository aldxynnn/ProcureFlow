import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsArray, IsDateString, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/types';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';
import { GoodsReceiptsService } from './goods-receipts.service';
class ReceiptLineDto { @IsString() purchaseOrderItemId!: string; @IsNumber() @Min(0.0001) quantityReceived!: number; }
class CreateReceiptDto { @IsOptional() @IsString() receiptNumber?: string; @IsOptional() @IsDateString() receivedAt?: string; @IsOptional() @IsString() note?: string; @IsArray() @ValidateNested({each:true}) @Type(() => ReceiptLineDto) items!: ReceiptLineDto[]; }
@ApiTags('goods-receipts') @ApiBearerAuth() @UseGuards(JwtGuard, RolesGuard) @Controller('api/goods-receipts')
export class GoodsReceiptsController {
  constructor(private readonly service: GoodsReceiptsService) {}
  @Post(':poId') @Roles(Role.PROCUREMENT, Role.ADMIN) create(@CurrentUser() user: AuthUser, @Param('poId') poId: string, @Body() body: CreateReceiptDto) { return this.service.create(user, poId, body); }
}
