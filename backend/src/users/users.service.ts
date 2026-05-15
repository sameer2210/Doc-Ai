import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@prisma-local/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { AuditLogService } from '@audit-log/audit-log.service';
import { AuditAction, AuditContext } from '@common/constants/audit.enum';
import { getChangedFields } from '@common/utils/diff-fields.util';

@Injectable()
export class UsersService {
  constructor(
    private auditLogService: AuditLogService,
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateUserDto) {
    const user = await this.prisma.user.create({
      data: {
        ...dto,
      },
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
        bio: true,
        avatarUrl: true,
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

  // async remove(userId: string) {
  //   await this.getById(userId);
  //   return this.prisma.user.delete({
  //     where: { id: userId },
  //   });
  // }
}
