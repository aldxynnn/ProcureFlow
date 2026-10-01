import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/types';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';
import { VendorsService } from './vendors.service';
class VendorContactDto { @IsString() name!: string; @IsOptional() @IsEmail() email?: string; @IsOptional() @IsString() phone?: string; @IsOptional() @IsString() roleTitle?: string; }
class CreateVendorDto { @IsString() legalName!: string; @IsOptional() @IsString() displayName?: string; @IsOptional() @IsString() taxId?: string; @IsOptional() @IsEmail() email?: string; @IsOptional() @IsString() phone?: string; @IsOptional() @IsString() address?: string; @IsOptional() contact?: VendorContactDto; }
@ApiTags('vendors') @ApiBearerAuth() @UseGuards(JwtGuard, RolesGuard) @Controller('api/vendors')
export class VendorsController {
  constructor(private readonly service: VendorsService) {}
  @Get() @Roles(Role.PROCUREMENT, Role.FINANCE, Role.ADMIN) list(@CurrentUser() user: AuthUser, @Query('q') q?: string) { return this.service.list(user, q); }
  @Get(':id') @Roles(Role.PROCUREMENT, Role.FINANCE, Role.ADMIN) get(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.get(user, id); }
  @Post() @Roles(Role.PROCUREMENT, Role.ADMIN) create(@CurrentUser() user: AuthUser, @Body() body: CreateVendorDto) { return this.service.create(user, body); }
}
