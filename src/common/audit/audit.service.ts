import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

interface AuditLogInput {
  userId: string;
  projectId?: string | null;
  action: string;
  resource: string;
  details?: Prisma.InputJsonValue;
  changes?: Prisma.InputJsonValue;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          userId: input.userId,
          projectId: input.projectId ?? null,
          action: input.action,
          resource: input.resource,
          details: this.toInputJson(input.details),
          changes: this.toInputJson(input.changes),
          ipAddress: input.ipAddress,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to write audit log: ${message}`);
      return null;
    }
  }

  private toInputJson(value: Prisma.InputJsonValue | undefined) {
    if (value === undefined) {
      return undefined;
    }

    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
