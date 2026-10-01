import { Controller, Get, Param, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/types';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { AttachmentsService, ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from './attachments.service';
@ApiTags('attachments') @ApiBearerAuth() @UseGuards(JwtGuard) @Controller('api/attachments')
export class AttachmentsController {
  constructor(private readonly service: AttachmentsService) {}
  @Get() list(@CurrentUser() user: AuthUser, @Query('entityType') entityType: string, @Query('entityId') entityId: string) { return this.service.list(user, entityType, entityId); }
  @Post() @ApiConsumes('multipart/form-data') @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE }, fileFilter: (_req, file, cb) => cb(null, (ALLOWED_FILE_TYPES as readonly string[]).includes(file.mimetype)) })) upload(@CurrentUser() user: AuthUser, @UploadedFile() file: any, @Query('entityType') entityType: string, @Query('entityId') entityId: string) { return this.service.upload(user, entityType, entityId, file); }
  @Get(':id/download') async download(@CurrentUser() user: AuthUser, @Param('id') id: string, @Res() res: Response) { const data = await this.service.download(user, id); if ('url' in data) return res.json(data); res.set({ 'Content-Type': data.attachment.contentType, 'Content-Disposition': `attachment; filename="${data.attachment.originalName}"` }); return res.send(data.buffer); }
}
