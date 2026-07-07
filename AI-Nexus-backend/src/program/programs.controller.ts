import {
    Controller,
    HttpStatus,
    Param,
    Get,
    Post,
    Delete,
    Put,
    Body,
    Query,
    Res,
    UseGuards,
} from '@nestjs/common';
import { UserRole } from '../user/users.entity';
import { Response } from 'express';
import { ProgramService, ProgramPaginatedListResult } from './programs.service';
import { CreateProgramDto, UpdateProgramDto } from './programs.dto';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { RolesGuard } from '../jwt/roles.guard';
import { Roles } from '../jwt/roles.decorator';
import { SessionGuard } from '../jwt/session.guard';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationService } from '../common/pagination/pagination.service';

const DEFAULT_PROGRAMS_PAGE = 1;
const DEFAULT_PROGRAMS_LIMIT = 10;

@ApiTags('Programs')
@Controller('programs')
export class ProgramController {
    constructor(
        private readonly programService: ProgramService,
        private readonly paginationService: PaginationService,
    ) {}

    @Get()
    @ApiOperation({ summary: 'List all programs' })
    async getAllPrograms(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
        @Res() response?: Response,
    ) {
        const hasFilters = Boolean(page || limit || search);
        if (hasFilters) {
            const result = await this.programService.getAll({
                usePagination: true,
                page: this.paginationService.parsePositiveInteger(page, DEFAULT_PROGRAMS_PAGE),
                limit: this.paginationService.parsePositiveInteger(limit, DEFAULT_PROGRAMS_LIMIT),
                search: search?.trim() || undefined,
            });
            const paginated = result as ProgramPaginatedListResult;
            return response!.status(HttpStatus.OK).json({
                length: paginated.data.length,
                data: paginated.data,
                pagination: paginated.pagination,
            });
        }

        const programs = await this.programService.getAll();
        const list = Array.isArray(programs) ? programs : programs.data;
        return response!.status(HttpStatus.OK).json({ length: list.length, data: list });
    }

    @Get('by-course/:courseId')
    @ApiOperation({ summary: 'Get active program linked to a course' })
    async getProgramByCourseId(@Param('courseId') courseId: string, @Res() response: Response) {
        const program = await this.programService.getByCourseId(courseId);
        return response.status(HttpStatus.OK).json({ data: program });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get program details by id' })
    async getProgramById(@Param('id') id: string, @Res() response: Response) {
        const program = await this.programService.getById(id);
        return response.status(HttpStatus.OK).json({ data: program });
    }

    @Post()
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Create a program' })
    @ApiBody({ type: CreateProgramDto })
    async createProgram(@Body() dto: CreateProgramDto, @Res() response: Response) {
        const result = await this.programService.create(dto);
        return response.status(HttpStatus.CREATED).json(result);
    }

    @Put('update/:id')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Update a program' })
    @ApiBody({ type: UpdateProgramDto })
    async updateProgram(
        @Param('id') id: string,
        @Body() dto: UpdateProgramDto,
        @Res() response: Response,
    ) {
        const result = await this.programService.update(id, dto);
        return response.status(HttpStatus.OK).json(result);
    }

    @Delete('delete/:id')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Delete a program' })
    async deleteProgram(@Param('id') id: string, @Res() response: Response) {
        const result = await this.programService.delete(id);
        return response.status(HttpStatus.OK).json(result);
    }
}
