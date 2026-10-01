import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/types';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { OrganizationsService } from './organizations.service';
class RenameDto { @IsString() name!: string; }
class DepartmentDto { @IsString() name!: string; @IsString() code!: string; }
class CreateUserDto { @IsString() name!: string; @IsEmail() email!: string; @IsString() @MinLength(12) password!: string; @IsEnum(Role) role!: Role; @IsOptional() @IsString() departmentId?: string; @IsOptional() @IsString() managerId?: string; }
class UpdateUserDto { @IsOptional() @IsEnum(Role) role?: Role; @IsOptional() @IsBoolean() isActive?: boolean; @IsOptional() @IsString() departmentId?: string | null; @IsOptional() @IsString() managerId?: string | null; }
@ApiTags('organizations') @ApiBearerAuth() @UseGuards(JwtGuard, RolesGuard) @Controller('api/organization')
export class OrganizationsController {
  constructor(private readonly service: OrganizationsService) {}
  @Get() get(@CurrentUser() user: AuthUser) { return this.service.get(user); }
  @Patch() @Roles(Role.ADMIN) rename(@CurrentUser() user: AuthUser, @Body() body: RenameDto) { return this.service.rename(user, body.name); }
  @Post('departments') @Roles(Role.ADMIN) createDepartment(@CurrentUser() user: AuthUser, @Body() body: DepartmentDto) { return this.service.createDepartment(user, body); }
  @Post('users') @Roles(Role.ADMIN) createUser(@CurrentUser() user: AuthUser, @Body() body: CreateUserDto) { return this.service.createUser(user, body); }
  @Patch('users/:id') @Roles(Role.ADMIN) updateUser(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: UpdateUserDto) { return this.service.updateUser(user, id, body); }
}
