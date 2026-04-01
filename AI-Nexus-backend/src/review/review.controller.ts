import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ReviewService } from './review.service';
import { CreateReviewDto, UpdateReviewDto } from './review.dto';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../jwt/optional-jwt-auth.guard';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Create a review' })
  @ApiBody({ type: CreateReviewDto })
  async create(@Body() dto: CreateReviewDto, @Res() res: Response) {
    const review = await this.reviewService.create(dto);
    return res.status(HttpStatus.CREATED).json(review);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List reviews with optional filters' })
  @ApiQuery({ name: 'courseId', required: false, description: 'Filter reviews by course id' })
  @ApiQuery({ name: 'speakerId', required: false, description: 'Filter reviews by speaker id' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter reviews by user id' })
  async findAll(
    @Query('courseId') courseId?: string,
    @Query('speakerId') speakerId?: string,
    @Query('userId') userId?: string,
    @Res() res?: Response,
  ) {
    const reviews = await this.reviewService.findAll({
      ...(courseId && { courseId }),
      ...(speakerId && { speakerId }),
      ...(userId && { userId }),
    });
    return res!.status(HttpStatus.OK).json({ length: reviews.length, data: reviews });
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get review details by id' })
  async findOne(@Param('id') id: string, @Res() res: Response) {
    const review = await this.reviewService.findOne(id);
    if (!review) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'Review not found' });
    }
    return res.status(HttpStatus.OK).json(review);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update a review' })
  @ApiBody({ type: UpdateReviewDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
    @Res() res: Response,
  ) {
    const review = await this.reviewService.update(id, dto);
    return res.status(HttpStatus.OK).json(review);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Delete a review' })
  async remove(@Param('id') id: string, @Res() res: Response) {
    await this.reviewService.remove(id);
    return res.status(HttpStatus.NO_CONTENT).send();
  }
}
