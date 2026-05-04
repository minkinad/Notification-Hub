import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
  Version,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtGuard } from '@common/guards/jwt.guard';
import { JwtUser } from '@common/types/jwt-user.interface';
import { CreateEventDto, EventListQueryDto } from './dto/create-event.dto';
import { IngestEventDto } from './dto/ingest-event.dto';
import { EventsService } from './events.service';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @Version('1')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create event for owned project' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  async create(
    @CurrentUser() user: JwtUser,
    @Body() createEventDto: CreateEventDto,
  ) {
    return this.eventsService.create(user.id, createEventDto);
  }

  @Post('ingest')
  @Version('1')
  @ApiHeader({
    name: 'x-api-key',
    description: 'Project API key',
    required: true,
  })
  @ApiOperation({ summary: 'Ingest event using project API key' })
  @ApiResponse({ status: 201, description: 'Event ingested successfully' })
  async ingest(
    @Headers('x-api-key') apiKey: string,
    @Body() ingestEventDto: IngestEventDto,
  ) {
    return this.eventsService.ingest(apiKey, ingestEventDto);
  }

  @Get()
  @Version('1')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List events for owned projects' })
  @ApiResponse({ status: 200, description: 'Events list retrieved' })
  async findAll(
    @CurrentUser() user: JwtUser,
    @Query() query: EventListQueryDto,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take: number,
  ) {
    return this.eventsService.findAll(user.id, query, skip, take);
  }

  @Get(':id')
  @Version('1')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get event details' })
  @ApiResponse({ status: 200, description: 'Event details retrieved' })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.eventsService.findOne(id, user.id);
  }
}
