import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Version,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtGuard } from '@common/guards/jwt.guard';
import { JwtUser } from '@common/types/jwt-user.interface';
import { ChannelsService } from './channels.service';
import { ChannelListQueryDto } from './dto/channel-list-query.dto';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@ApiTags('channels')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post()
  @Version('1')
  @ApiOperation({ summary: 'Create notification channel' })
  @ApiResponse({ status: 201, description: 'Channel created successfully' })
  async create(
    @CurrentUser() user: JwtUser,
    @Body() createChannelDto: CreateChannelDto,
  ) {
    return this.channelsService.create(user.id, createChannelDto);
  }

  @Get()
  @Version('1')
  @ApiOperation({ summary: 'List project channels' })
  @ApiResponse({ status: 200, description: 'Channels list retrieved' })
  async findAll(
    @CurrentUser() user: JwtUser,
    @Query() query: ChannelListQueryDto,
  ) {
    return this.channelsService.findAll(user.id, query.projectId);
  }

  @Get(':id')
  @Version('1')
  @ApiOperation({ summary: 'Get channel details' })
  @ApiResponse({ status: 200, description: 'Channel details retrieved' })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.channelsService.findOne(id, user.id);
  }

  @Patch(':id')
  @Version('1')
  @ApiOperation({ summary: 'Update channel' })
  @ApiResponse({ status: 200, description: 'Channel updated successfully' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() updateChannelDto: UpdateChannelDto,
  ) {
    return this.channelsService.update(id, user.id, updateChannelDto);
  }

  @Delete(':id')
  @Version('1')
  @ApiOperation({ summary: 'Delete channel' })
  @ApiResponse({ status: 200, description: 'Channel deleted successfully' })
  async delete(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.channelsService.delete(id, user.id);
  }
}
