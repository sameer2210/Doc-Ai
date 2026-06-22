import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '@prisma-local/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { AuditLogService } from '@audit-log/audit-log.service';
import { AuditAction, AuditContext } from '@common/constants/audit.enum';
import { getChangedFields } from '@common/utils/diff-fields.util';
import { HashService } from '@auth/hash/hash.service';
import { Prisma } from '@prisma/client';
import { UploadsService } from '../uploads/uploads.service';
import { RequestContextService } from '@common/context/request-context.service';

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  role: true,
  bodyInsightCompleted: true,
  googleId: false,
  password: false,
  hashedRefreshToken: false,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private auditLogService: AuditLogService,
    private readonly prisma: PrismaService,
    private readonly hashService: HashService,
    private readonly uploadsService: UploadsService,
    private readonly requestContext: RequestContextService,
  ) {}

  async create(dto: CreateUserDto) {
    const hashedPassword = await this.hashService.hashData(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: hashedPassword,
        role: 'USER',
      },
      select: publicUserSelect,
    });

    await this.auditLogService.logEvent({
      userId: user.id,
      action: AuditAction.USER_CREATED,
      context: AuditContext.USER,
      metadata: {
        email: user.email,
        name: user.name,
      },
    });

    return user;
  }

  async getById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: publicUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.auditLogService.logEvent({
      userId,
      action: AuditAction.USER_PROFILE_VIEWED,
      context: AuditContext.USER,
      metadata: {
        userId: user.id,
        email: user.email,
        name: user.name,
      },
    });

    return user;
  }

  async update(userId: string, dto: UpdateUserDto) {
    const user = await this.getById(userId);
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        ...dto,
      },
      select: publicUserSelect,
    });

    const changedFields = getChangedFields(user, dto);

    await this.auditLogService.logEvent({
      userId,
      action: AuditAction.USER_UPDATED,
      context: AuditContext.USER,
      metadata: {
        updatedFields: changedFields,
      },
    });

    return updatedUser;
  }

  async getAll(adminUserId: string) {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.auditLogService.logEvent({
      userId: adminUserId,
      action: AuditAction.ADMIN_VIEWED_ALL_USERS,
      context: AuditContext.USER,
      metadata: {
        userCount: users.length,
        viewedBy: adminUserId,
      },
    });

    return users;
  }

  // async findByEmail(email: string) {
  //   return this.prisma.user.findUnique({
  //     where: { email },
  //   });
  // }

  async deleteAccount(userId: string): Promise<{ success: boolean }> {
    const startTime = Date.now();
    const requestId = this.requestContext.requestId() ?? 'unknown';

    // 1. Verify user exists before deletion and throw NotFoundException only when user is missing.
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('User account not found');
    }

    // 2. Fetch S3 keys first (before DB records are deleted and cascade prunes Upload rows)
    const uploads = await this.prisma.upload.findMany({
      where: { userId },
      select: { s3Key: true },
    });
    const s3Keys = uploads.map((u) => u.s3Key);

    // 3. Delete database records. No generic try/catch: allow database errors to bubble up naturally.
    await this.prisma.user.delete({
      where: { id: userId },
    });

    // 4. Delete S3 objects post-commit. S3 errors are captured safely so they don't corrupt the successful DB transaction response.
    if (s3Keys.length > 0) {
      try {
        await this.uploadsService.deleteObjects(s3Keys);
        const executionDuration = Date.now() - startTime;
        this.logger.log(
          `[USER_ACCOUNT_DELETED] User account successfully deleted with S3 assets. ` +
          `requestId=${requestId} deletedUploadsCount=${s3Keys.length} executionDuration=${executionDuration}ms outcome=success`
        );
      } catch (error) {
        const executionDuration = Date.now() - startTime;
        this.logger.error(
          `[USER_ACCOUNT_DELETED] Database records deleted, but failed to clean up S3 objects. ` +
          `requestId=${requestId} deletedUploadsCount=${s3Keys.length} executionDuration=${executionDuration}ms outcome=s3_cleanup_failed ` +
          `error=${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    } else {
      const executionDuration = Date.now() - startTime;
      this.logger.log(
        `[USER_ACCOUNT_DELETED] User account successfully deleted (no S3 assets). ` +
        `requestId=${requestId} deletedUploadsCount=0 executionDuration=${executionDuration}ms outcome=success`
      );
    }

    return {
      success: true,
    };
  }
  async exists(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    return !!user;
  }

}
