import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/types';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Controller('api/users')
export class UsersController {
    constructor(private readonly users: UsersService) { }

    @Get()
    @Roles(Role.ADMIN)
    list(@CurrentUser() user: AuthUser) {
        return this.users.list(user.organizationId);
    }

    @Get('roles')
    listRoles(@CurrentUser() _user: AuthUser) {
        return this.users.roleValues();
    }
}