import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CourseEnrollmentEntity } from './course-enrollment.entity';
import { CourseEntity } from './courses.entity';

@Injectable()
export class CourseEnrollmentService {
  constructor(
    @InjectRepository(CourseEnrollmentEntity)
    private readonly enrollmentRepository: Repository<CourseEnrollmentEntity>,
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
  ) {}

  /**
   * Direct enrollments plus every course id listed on bundles the user is enrolled in.
   */
  async getEffectiveEnrolledCourseIdSet(userId: string): Promise<Set<string>> {
    const rows = await this.enrollmentRepository.find({
      where: { userId },
      select: ['courseId'],
    });
    const set = new Set(rows.map((r) => r.courseId));
    if (set.size === 0) {
      return set;
    }
    const bundles = await this.courseRepository.find({
      where: { id: In([...set]), isBundle: true },
      select: ['bundleCourseIds'],
    });
    for (const b of bundles) {
      for (const cid of b.bundleCourseIds || []) {
        if (typeof cid === 'string' && cid.trim()) {
          set.add(cid.trim());
        }
      }
    }
    return set;
  }

  /** True when a bundle the user is enrolled in lists this course (no direct enrollment row). */
  private async isUnlockedViaBundleOnly(userId: string, courseId: string): Promise<boolean> {
    const bundlesContaining = await this.courseRepository
      .createQueryBuilder('c')
      .select('c.id')
      .where('c.isBundle = :ib', { ib: true })
      .andWhere('c.bundleCourseIds IS NOT NULL')
      .andWhere(`c."bundleCourseIds"::jsonb @> :frag::jsonb`, {
        frag: JSON.stringify([courseId]),
      })
      .getMany();
    if (bundlesContaining.length === 0) {
      return false;
    }
    const n = await this.enrollmentRepository.count({
      where: { userId, courseId: In(bundlesContaining.map((b) => b.id)) },
    });
    return n > 0;
  }

  /**
   * enrolled: direct enrollment or included in an owned bundle (paid or free).
   * accessViaBundle: enrolled only because an owned bundle lists this course (no separate purchase).
   */
  async getEnrollmentBreakdown(
    userId: string,
    courseId: string,
  ): Promise<{ enrolled: boolean; accessViaBundle: boolean }> {
    const direct = await this.enrollmentRepository.findOne({
      where: { userId, courseId },
    });
    if (direct) {
      return { enrolled: true, accessViaBundle: false };
    }
    const viaBundle = await this.isUnlockedViaBundleOnly(userId, courseId);
    return { enrolled: viaBundle, accessViaBundle: viaBundle };
  }

  async isEnrolled(userId: string, courseId: string): Promise<boolean> {
    const direct = await this.enrollmentRepository.findOne({
      where: { userId, courseId },
    });
    if (direct) {
      return true;
    }
    return this.isUnlockedViaBundleOnly(userId, courseId);
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
