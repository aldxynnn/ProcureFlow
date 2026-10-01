import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/types';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BudgetsService } from './budgets.service';
import { Role } from '@prisma/client';

class CreateBudgetDto {
  @IsString() name!: string;
  @IsNumber() @Min(2000) @Max(2200) fiscalYear!: number;
  @IsNumber() @Min(0) allocatedAmount!: number;
  @IsOptional() @IsString() departmentId?: string;
}

@ApiTags('budgets') @ApiBearerAuth() @UseGuards(JwtGuard, RolesGuard) @Controller('api/budgets')
export class BudgetsController {
  constructor(private readonly service: BudgetsService) {}
  @Get() @Roles(Role.EMPLOYEE, Role.MANAGER, Role.PROCUREMENT, Role.FINANCE, Role.ADMIN) list(@CurrentUser() user: AuthUser) { return this.service.list(user); }
  @Post() @Roles(Role.MANAGER, Role.FINANCE, Role.ADMIN) create(@CurrentUser() user: AuthUser, @Body() body: CreateBudgetDto) { return this.service.create(user, body); }
}
