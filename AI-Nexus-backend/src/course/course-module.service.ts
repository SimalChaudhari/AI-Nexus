import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseModuleEntity } from './course-module.entity';
import { CreateCourseModuleDto, UpdateCourseModuleDto } from './course-module.dto';
import { CourseService } from './courses.service';

@Injectable()
export class CourseModuleService {
  constructor(
    @InjectRepository(CourseModuleEntity)
    private readonly moduleRepository: Repository<CourseModuleEntity>,
    private readonly courseService: CourseService,
  ) {}

  async findByCourseId(courseId: string): Promise<CourseModuleEntity[]> {
    await this.courseService.getById(courseId);
    return this.moduleRepository.find({
      where: { courseId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async getById(id: string): Promise<CourseModuleEntity> {
    const mod = await this.moduleRepository.findOne({ where: { id } });
    if (!mod) throw new NotFoundException('Course module not found');
    return mod;
  }

  async create(courseId: string, dto: CreateCourseModuleDto): Promise<CourseModuleEntity> {
    await this.courseService.getById(courseId);
    const maxOrder = await this.moduleRepository
      .createQueryBuilder('m')
      .select('MAX(m.sortOrder)', 'max')
      .where('m.courseId = :courseId', { courseId })
      .getRawOne();
    const nextOrder = maxOrder?.max != null ? Number(maxOrder.max) + 1 : 0;
    const sortOrder = dto.sortOrder ?? nextOrder;
    const module = this.moduleRepository.create({
      courseId,
      title: dto.title,
      description: dto.description,
      sortOrder,
    });
    return this.moduleRepository.save(module);
  }

  async update(id: string, dto: UpdateCourseModuleDto): Promise<CourseModuleEntity> {
    const module = await this.moduleRepository.findOne({ where: { id } });
    if (!module) throw new NotFoundException('Course module not found');
    if (dto.title !== undefined) module.title = dto.title;
    if (dto.description !== undefined) module.description = dto.description;
    if (dto.sortOrder !== undefined) module.sortOrder = dto.sortOrder;
    return this.moduleRepository.save(module);
  }

  async delete(id: string): Promise<{ message: string }> {
    const module = await this.moduleRepository.findOne({ where: { id } });
    if (!module) throw new NotFoundException('Course module not found');
    await this.moduleRepository.remove(module);
    return { message: 'Module deleted successfully' };
  }
}
