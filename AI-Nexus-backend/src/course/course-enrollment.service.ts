import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseEnrollmentEntity } from './course-enrollment.entity';

@Injectable()
export class CourseEnrollmentService {
  constructor(
    @InjectRepository(CourseEnrollmentEntity)
    private readonly enrollmentRepository: Repository<CourseEnrollmentEntity>,
  ) {}

  async isEnrolled(userId: string, courseId: string): Promise<boolean> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { userId, courseId },
    });
    return !!enrollment;
  }

  async enroll(userId: string, courseId: string): Promise<CourseEnrollmentEntity> {
    const existing = await this.enrollmentRepository.findOne({
      where: { userId, courseId },
    });
    if (existing) return existing;
    const enrollment = this.enrollmentRepository.create({ userId, courseId });
    return this.enrollmentRepository.save(enrollment);
  }

  async enrollMany(userId: string, courseIds: string[]): Promise<void> {
    const uniqueIds = [...new Set(courseIds)].filter(Boolean);
    await Promise.all(uniqueIds.map((courseId) => this.enroll(userId, courseId)));
  }

  async getEnrolledCourseIds(userId: string): Promise<string[]> {
    const rows = await this.enrollmentRepository.find({
      where: { userId },
      select: ['courseId'],
    });
    return rows.map((r) => r.courseId);
  }
}
