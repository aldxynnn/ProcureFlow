import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/database/prisma.service';
import { AuthUser } from '../../common/auth/types';
import { Role } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import {
  mkdir,
  writeFile,
  readFile,
} from 'node:fs/promises';
import {
  join,
  basename,
} from 'node:path';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
] as const;

@Injectable()
export class AttachmentsService {
  private readonly s3?: S3Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    if (this.config.get('STORAGE_DRIVER') === 's3') {
      this.s3 = new S3Client({
        region: this.config.getOrThrow('S3_REGION'),
        endpoint:
          this.config.get('S3_ENDPOINT') || undefined,
      });
    }
  }

  /**
   * Prisma returns Attachment.sizeBytes as bigint.
   * JSON serialization cannot serialize bigint directly,
   * so convert it to a normal number before returning it
   * through the API.
   *
   * The upload limit is 10 MB, so Number() is safe here.
   */
  private serializeAttachment<T extends Record<string, any>>(
    attachment: T,
  ) {
    return {
      ...attachment,
      sizeBytes:
        typeof attachment.sizeBytes === 'bigint'
          ? Number(attachment.sizeBytes)
          : attachment.sizeBytes,
    };
  }

  private async assertEntity(
    user: AuthUser,
    entityType: string,
    entityId: string,
  ) {
    if (
      ![
        'PurchaseRequest',
        'VendorQuote',
        'PurchaseOrder',
        'Invoice',
      ].includes(entityType)
    ) {
      throw new BadRequestException(
        'Unsupported attachment entity type',
      );
    }

    if (entityType === 'PurchaseRequest') {
      const entity =
        await this.prisma.purchaseRequest.findFirst({
          where: {
            id: entityId,
            organizationId: user.organizationId,
          },
          include: {
            requester: true,
          },
        });

      if (!entity) {
        throw new NotFoundException(
          'Attachment entity not found',
        );
      }

      if (
        user.role === Role.EMPLOYEE &&
        entity.requesterId !== user.id
      ) {
        throw new ForbiddenException();
      }

      if (
        user.role === Role.MANAGER &&
        entity.requesterId !== user.id &&
        entity.requester.managerId !== user.id
      ) {
        throw new ForbiddenException();
      }

      if (
        user.role === Role.PROCUREMENT &&
        entity.status !== 'APPROVED'
      ) {
        throw new ForbiddenException(
          'Only approved purchase-request documents are visible to Procurement',
        );
      }

      if (user.role === Role.FINANCE) {
        throw new ForbiddenException();
      }

      return;
    }

    if (
      user.role === Role.EMPLOYEE ||
      user.role === Role.MANAGER
    ) {
      throw new ForbiddenException();
    }

    const checks: Record<
      string,
      () => Promise<any>
    > = {
      VendorQuote: () =>
        this.prisma.vendorQuote.findFirst({
          where: {
            id: entityId,
            organizationId: user.organizationId,
          },
        }),

      PurchaseOrder: () =>
        this.prisma.purchaseOrder.findFirst({
          where: {
            id: entityId,
            organizationId: user.organizationId,
          },
        }),

      Invoice: () =>
        this.prisma.invoice.findFirst({
          where: {
            id: entityId,
            organizationId: user.organizationId,
          },
        }),
    };

    if (!(await checks[entityType]!())) {
      throw new NotFoundException(
        'Attachment entity not found',
      );
    }
  }

  async upload(
    user: AuthUser,
    entityType: string,
    entityId: string,
    file: any,
  ) {
    if (!file) {
      throw new BadRequestException(
        'File is required',
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        'Maximum file size is 10 MB',
      );
    }

    if (
      !(ALLOWED_FILE_TYPES as readonly string[]).includes(
        file.mimetype,
      )
    ) {
      throw new BadRequestException(
        'Unsupported file type',
      );
    }

    await this.assertEntity(
      user,
      entityType,
      entityId,
    );

    const safe = basename(
      file.originalname,
    ).replace(
      /[^a-zA-Z0-9._-]/g,
      '_',
    );

    const objectKey = [
      user.organizationId,
      entityType,
      entityId,
      `${randomUUID()}-${safe}`,
    ].join('/');

    if (
      this.config.get('STORAGE_DRIVER') === 's3'
    ) {
      await this.s3!.send(
        new PutObjectCommand({
          Bucket:
            this.config.getOrThrow(
              'S3_BUCKET',
            ),
          Key: objectKey,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
    } else {
      const root = join(
        this.config.get(
          'STORAGE_LOCAL_DIR',
        ) ?? './tmp/uploads',
        user.organizationId,
        entityType,
        entityId,
      );

      await mkdir(root, {
        recursive: true,
      });

      const filename =
        objectKey.split('/').at(-1)!;

      await writeFile(
        join(root, filename),
        file.buffer,
      );
    }

    const attachment =
      await this.prisma.attachment.create({
        data: {
          organizationId:
            user.organizationId,
          entityType,
          entityId,
          objectKey,
          originalName: safe,
          contentType: file.mimetype,
          sizeBytes: file.size,
          createdById: user.id,
        },
      });

    return this.serializeAttachment(
      attachment,
    );
  }

  async list(
    user: AuthUser,
    entityType: string,
    entityId: string,
  ) {
    await this.assertEntity(
      user,
      entityType,
      entityId,
    );

    const attachments =
      await this.prisma.attachment.findMany({
        where: {
          organizationId:
            user.organizationId,
          entityType,
          entityId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

    return attachments.map(
      (attachment) =>
        this.serializeAttachment(
          attachment,
        ),
    );
  }

  async download(
    user: AuthUser,
    id: string,
  ) {
    const attachment =
      await this.prisma.attachment.findFirst({
        where: {
          id,
          organizationId:
            user.organizationId,
        },
      });

    if (!attachment) {
      throw new NotFoundException(
        'Attachment not found',
      );
    }

    await this.assertEntity(
      user,
      attachment.entityType,
      attachment.entityId,
    );

    const serializedAttachment =
      this.serializeAttachment(
        attachment,
      );

    if (
      this.config.get('STORAGE_DRIVER') === 's3'
    ) {
      return {
        url: await getSignedUrl(
          this.s3!,
          new GetObjectCommand({
            Bucket:
              this.config.getOrThrow(
                'S3_BUCKET',
              ),
            Key: attachment.objectKey,
          }),
          {
            expiresIn: 300,
          },
        ),
        attachment:
          serializedAttachment,
      };
    }

    const filename =
      attachment.objectKey
        .split('/')
        .at(-1)!;

    const base =
      this.config.get(
        'STORAGE_LOCAL_DIR',
      ) ?? './tmp/uploads';

    const buffer = await readFile(
      join(
        base,
        user.organizationId,
        attachment.entityType,
        attachment.entityId,
        filename,
      ),
    );

    return {
      attachment:
        serializedAttachment,
      buffer,
    };
  }
}