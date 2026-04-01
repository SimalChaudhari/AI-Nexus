import {
  Controller,
  HttpStatus,
  Param,
  Get,
  Post,
  Delete,
  Put,
  Body,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LanguageService } from './language.service';
import { CreateLanguageDto, UpdateLanguageDto } from './language.dto';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { RolesGuard } from '../jwt/roles.guard';
import { Roles } from '../jwt/roles.decorator';
import { SessionGuard } from '../jwt/session.guard';
import { OptionalJwtAuthGuard } from '../jwt/optional-jwt-auth.guard';
import { UserRole } from '../user/users.entity';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Languages')
@Controller('languages')
export class LanguageController {
  constructor(private readonly languageService: LanguageService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List all languages' })
  async getAll(@Req() request: Request, @Res() response: Response) {
    const isAdmin = request.user?.role === UserRole.Admin;
    const languages = isAdmin
      ? await this.languageService.getAllForAdmin()
      : await this.languageService.getAll();
    return response.status(HttpStatus.OK).json({
      length: languages.length,
      data: languages,
    });
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get language details by id' })
  async getById(
    @Param('id') id: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const isAdmin = request.user?.role === UserRole.Admin;
    const language = isAdmin
      ? await this.languageService.getByIdForAdmin(id)
      : await this.languageService.getById(id);
    return response.status(HttpStatus.OK).json({
      data: language,
    });
  }

  @Post()
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Create a language' })
  @ApiBody({ type: CreateLanguageDto })
  async create(@Body() createLanguageDto: CreateLanguageDto, @Res() response: Response) {
    const result = await this.languageService.create(createLanguageDto);
    return response.status(HttpStatus.CREATED).json(result);
  }

  @Put('update/:id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update a language' })
  @ApiBody({ type: UpdateLanguageDto })
  async update(
    @Param('id') id: string,
    @Body() updateLanguageDto: UpdateLanguageDto,
    @Res() response: Response,
  ) {
    const result = await this.languageService.update(id, updateLanguageDto);
    return response.status(HttpStatus.OK).json(result);
  }

  @Delete('delete/:id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Delete a language' })
  async delete(@Param('id') id: string, @Res() response: Response) {
    const result = await this.languageService.delete(id);
    return response.status(HttpStatus.OK).json(result);
  }
}
