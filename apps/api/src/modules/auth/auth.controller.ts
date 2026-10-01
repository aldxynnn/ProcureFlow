import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/types';
import { UsersService } from '../users/users.service';

class LoginDto { @IsEmail() email!: string; @IsString() @MinLength(8) password!: string; @IsString() organizationSlug!: string; }
@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly users: UsersService) {}
  @Post('login') @ApiBody({ type: LoginDto }) login(@Body() body: LoginDto, @Res({ passthrough: true }) response: Response) { return this.auth.login(body.email, body.password, body.organizationSlug, response); }
  @Post('refresh') refresh(@Req() req: Request, @Res({ passthrough: true }) response: Response) { return this.auth.refresh(req.cookies?.procureflow_refresh, response); }
  @Post('logout') logout(@Req() req: Request, @Res({ passthrough: true }) response: Response) { return this.auth.logout(req.cookies?.procureflow_refresh, response); }
  @Get('me') @UseGuards(JwtGuard) @ApiBearerAuth() me(@CurrentUser() user: AuthUser) { return this.users.me(user.id, user.organizationId); }
}
