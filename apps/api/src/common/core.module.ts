import { Global, Module } from '@nestjs/common';
import { PrismaService } from './database/prisma.service';
import { JwtGuard } from './guards/jwt.guard';
import { RolesGuard } from './guards/roles.guard';

@Global()
@Module({ providers: [PrismaService, JwtGuard, RolesGuard], exports: [PrismaService, JwtGuard, RolesGuard] })
export class CoreModule {}
