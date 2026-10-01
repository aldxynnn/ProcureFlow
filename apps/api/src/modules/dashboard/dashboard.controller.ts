import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/types';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DashboardService } from './dashboard.service';
@ApiTags('dashboard') @ApiBearerAuth() @UseGuards(JwtGuard, RolesGuard) @Controller('api/dashboard')
export class DashboardController { constructor(private readonly service: DashboardService) {} @Get() get(@CurrentUser() user: AuthUser) { return this.service.get(user); } }
