import { Module } from '@nestjs/common';
import { AuditModule } from '@common/audit/audit.module';
import { PrismaModule } from '@common/prisma/prisma.module';
import { ProjectsModule } from '@modules/projects/projects.module';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';

@Module({
  imports: [PrismaModule, ProjectsModule, AuditModule],
  controllers: [ChannelsController],
  providers: [ChannelsService],
  exports: [ChannelsService],
})
export class ChannelsModule {}
