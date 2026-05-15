import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '@prisma-local/prisma.service';
import { AuditLogService } from '@audit-log/audit-log.service';
import { NotFoundException } from '@nestjs/common';
import { AuditAction, AuditContext } from '@common/constants/audit.enum';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: jest.Mocked<PrismaService>;
  let auditLogService: jest.Mocked<AuditLogService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            logEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    auditLogService = module.get(
      AuditLogService,
    ) as jest.Mocked<AuditLogService>;
  });

  describe('create', () => {
    it('should create a user and log audit event', async () => {
      const dto = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'pass',
      };
      const mockUser = { id: 'user123', ...dto };

      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.create(dto);

      expect(result).toEqual(mockUser);
      expect(prisma.user.create).toHaveBeenCalledWith({ data: dto });
      expect(auditLogService.logEvent).toHaveBeenCalledWith({
        userId: mockUser.id,
        action: AuditAction.USER_CREATED,
        context: AuditContext.USER,
        metadata: { email: dto.email, name: dto.name },
      });
    });
  });

  describe('getById', () => {
    it('should return a user and log audit event', async () => {
      const mockUser = { id: 'user123', email: 'a@b.com', name: 'Alice' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.getById('user123');

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user123' },
      });
      expect(auditLogService.logEvent).toHaveBeenCalledWith({
        userId: mockUser.id,
        action: AuditAction.USER_PROFILE_VIEWED,
        context: AuditContext.USER,
        metadata: {
          userId: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
        },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getById('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update user and log changed fields', async () => {
      const user = { id: 'u1', email: 'a@b.com', name: 'Old Name' };
      const dto = { name: 'New Name' };
      const updated = { ...user, ...dto };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prisma.user.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.update(user.id, dto);

      expect(result).toEqual(updated);
      expect(auditLogService.logEvent).toHaveBeenLastCalledWith(
        expect.objectContaining({
          userId: user.id,
          action: AuditAction.USER_UPDATED,
          metadata: expect.objectContaining({
            updatedFields: {
              name: {
                old: 'Old Name',
                new: 'New Name',
              },
            },
          }),
        }),
      );
    });

    it('should log empty updatedFields if nothing changed', async () => {
      const user = { id: 'u1', name: 'Same', email: 'same@a.com' };
      const dto = { name: 'Same' };
      const updated = { ...user };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prisma.user.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.update(user.id, dto);

      expect(result).toEqual(updated);
      expect(auditLogService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            updatedFields: {},
          },
        }),
      );
    });
  });

  describe('getAll', () => {
    it('should return all users and log admin view', async () => {
      const users = [
        {
          id: '1',
          email: 'a@b.com',
          name: 'Alice',
          bio: null,
          avatarUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      (prisma.user.findMany as jest.Mock).mockResolvedValue(users);

      const result = await service.getAll('admin123');

      expect(result).toEqual(users);
      expect(prisma.user.findMany).toHaveBeenCalled();
      expect(auditLogService.logEvent).toHaveBeenCalledWith({
        userId: 'admin123',
        action: AuditAction.ADMIN_VIEWED_ALL_USERS,
        context: AuditContext.USER,
        metadata: {
          userCount: users.length,
          viewedBy: 'admin123',
        },
      });
    });
  });
});
