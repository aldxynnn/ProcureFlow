import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';
import { ApiTags } from '@nestjs/swagger';
import { SetupService } from './setup.service';

class InitializeWorkspaceDto {
  @IsString() @MinLength(2) organizationName!: string;
  @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) organizationSlug!: string;
  @IsString() @MinLength(2) adminName!: string;
  @IsEmail() adminEmail!: string;
  @IsString() @MinLength(12) adminPassword!: string;
  @IsString() @MinLength(2) departmentName!: string;
  @IsString() @Matches(/^[A-Za-z0-9_-]{2,12}$/) departmentCode!: string;
}

@ApiTags('setup')
@Controller('api/setup')
export class SetupController {
  constructor(private readonly setup: SetupService) {}

  @Get('status') status() {
    return this.setup.status();
  }

  @Post('initialize') initialize(@Body() body: InitializeWorkspaceDto) {
    return this.setup.initialize(body);
  }
}
