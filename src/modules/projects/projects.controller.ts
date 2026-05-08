import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
  Version,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { JwtUser } from '@common/types/jwt-user.interface';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Version('1')
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  async create(
    @CurrentUser() user: JwtUser,
    @Body() createProjectDto: CreateProjectDto,
  ) {
    return this.projectsService.create(user.id, createProjectDto);
  }

  @Get()
  @Version('1')
  @ApiOperation({ summary: 'List user projects' })
  @ApiResponse({ status: 200, description: 'Projects list retrieved' })
  async findAll(
    @CurrentUser() user: JwtUser,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take: number,
  ) {
    return this.projectsService.findAll(user.id, skip, take);
  }

  @Get(':id')
  @Version('1')
  @ApiOperation({ summary: 'Get project details' })
  @ApiResponse({ status: 200, description: 'Project details retrieved' })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.projectsService.findOne(id, user.id);
  }

  @Patch(':id')
  @Version('1')
  @ApiOperation({ summary: 'Update project' })
  @ApiResponse({ status: 200, description: 'Project updated successfully' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, user.id, updateProjectDto);
  }

  @Delete(':id')
  @Version('1')
  @ApiOperation({ summary: 'Delete project' })
  @ApiResponse({ status: 200, description: 'Project deleted successfully' })
  async delete(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.projectsService.delete(id, user.id);
  }

  @Post(':id/regenerate-key')
  @Version('1')
  @ApiOperation({ summary: 'Regenerate project API key' })
  @ApiResponse({ status: 200, description: 'API key regenerated' })
  async regenerateApiKey(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.projectsService.regenerateApiKey(id, user.id);
  }
}
