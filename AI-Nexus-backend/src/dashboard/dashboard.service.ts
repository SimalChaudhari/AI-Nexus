import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { UserEntity, UserRole } from '../user/users.entity';
import { CourseEntity } from '../course/courses.entity';
import { OrderEntity, OrderStatus } from '../order/order.entity';
import { ReviewEntity } from '../review/review.entity';
import { CourseEnrollmentEntity } from '../course/course-enrollment.entity';

export interface DashboardStats {
  totalUsers: number;
  totalCourses: number;
  totalOrders: number;
  totalRevenue: number;
  completedOrders: number;
  pendingOrders: number;
  totalEnrollments: number;
  percentChange: {
    users: number;
    courses: number;
    orders: number;
    revenue: number;
    enrollments: number;
  };
  /** Last 8 weeks — used for KPI sparklines */
  weeklySeries: {
    labels: string[];
    users: number[];
    courses: number[];
    orders: number[];
    revenue: number[];
    enrollments: number[];
  };
  /** Last 6 calendar months — used for overview charts */
  monthlySeries: {
    labels: string[];
    users: number[];
    courses: number[];
    orders: number[];
    revenue: number[];
    enrollments: number[];
  };
  orderStatusBreakdown: Array<{ label: string; value: number }>;
}

export interface RecentOrderItem {
  id: string;
  orderNumber?: string;
  totalAmount: number;
  currency: string;
  status: string;
  createdAt: string;
  userEmail?: string;
  userName?: string;
}

export interface TopRatedCourseItem {
  id: string;
  title: string;
  image?: string;
  level?: string;
  freeOrPaid?: boolean;
  amount?: number;
  avgRating: number;
  ratingCount: number;
}

type TimeBucket = { key: string; label: string; start: Date; end: Date };

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(ReviewEntity)
    private readonly reviewRepository: Repository<ReviewEntity>,
    @InjectRepository(CourseEnrollmentEntity)
    private readonly enrollmentRepository: Repository<CourseEnrollmentEntity>,
  ) {}

  async getStats(): Promise<DashboardStats> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalCourses,
      totalOrders,
      completedOrders,
      pendingOrders,
      totalEnrollments,
      revenueRow,
      usersCurrent,
      usersPrevious,
      coursesCurrent,
      coursesPrevious,
      ordersCurrent,
      ordersPrevious,
      revenueCurrentRow,
      revenuePreviousRow,
      enrollmentsCurrent,
      enrollmentsPrevious,
      statusRows,
    ] = await Promise.all([
      this.countPlatformUsers(),
      this.courseRepository.count(),
      this.orderRepository.count(),
      this.orderRepository.count({ where: { status: OrderStatus.Completed } }),
      this.orderRepository.count({ where: { status: OrderStatus.Pending } }),
      this.enrollmentRepository.count(),
      this.orderRepository
        .createQueryBuilder('o')
        .select('COALESCE(SUM(o.totalAmount), 0)', 'total')
        .where('o.status = :status', { status: OrderStatus.Completed })
        .getRawOne<{ total: string }>(),
      this.countPlatformUsersSince(sevenDaysAgo),
      this.countPlatformUsersBetween(fourteenDaysAgo, sevenDaysAgo),
      this.countSince(this.courseRepository, 'course', sevenDaysAgo),
      this.countBetween(this.courseRepository, 'course', fourteenDaysAgo, sevenDaysAgo),
      this.countCompletedOrdersSince(sevenDaysAgo),
      this.countCompletedOrdersBetween(fourteenDaysAgo, sevenDaysAgo),
      this.sumCompletedRevenueSince(sevenDaysAgo),
      this.sumCompletedRevenueBetween(fourteenDaysAgo, sevenDaysAgo),
      this.countSince(this.enrollmentRepository, 'enrollment', sevenDaysAgo),
      this.countBetween(this.enrollmentRepository, 'enrollment', fourteenDaysAgo, sevenDaysAgo),
      this.orderRepository
        .createQueryBuilder('o')
        .select('o.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('o.status')
        .getRawMany<{ status: string; count: string }>(),
    ]);

    const totalRevenue = this.toNumber(revenueRow?.total);
    const revenueCurrent = this.toNumber(revenueCurrentRow?.total);
    const revenuePrevious = this.toNumber(revenuePreviousRow?.total);

    const monthBuckets = this.buildMonthBuckets(now, 6);
    const weekBuckets = this.buildWeekBuckets(now, 8);

    const [monthlySeries, weeklySeries] = await Promise.all([
      this.buildSeriesForBuckets(monthBuckets),
      this.buildSeriesForBuckets(weekBuckets),
    ]);

    const statusMap = new Map(
      statusRows.map((row) => [String(row.status || '').toLowerCase(), this.toNumber(row.count)]),
    );

    const orderStatusBreakdown = [
      { label: 'Completed', value: statusMap.get(OrderStatus.Completed) || 0 },
      { label: 'Pending', value: statusMap.get(OrderStatus.Pending) || 0 },
      { label: 'Failed', value: statusMap.get(OrderStatus.Failed) || 0 },
      { label: 'Cancelled', value: statusMap.get(OrderStatus.Cancelled) || 0 },
      { label: 'Refunded', value: statusMap.get(OrderStatus.Refunded) || 0 },
    ].filter((item) => item.value > 0);

    const breakdown =
      orderStatusBreakdown.length > 0
        ? orderStatusBreakdown
        : [
            { label: 'Completed', value: 0 },
            { label: 'Pending', value: 0 },
          ];

    return {
      totalUsers,
      totalCourses,
      totalOrders,
      totalRevenue,
      completedOrders,
      pendingOrders,
      totalEnrollments,
      percentChange: {
        users: this.percentChange(usersCurrent, usersPrevious),
        courses: this.percentChange(coursesCurrent, coursesPrevious),
        orders: this.percentChange(ordersCurrent, ordersPrevious),
        revenue: this.percentChange(revenueCurrent, revenuePrevious),
        enrollments: this.percentChange(enrollmentsCurrent, enrollmentsPrevious),
      },
      weeklySeries,
      monthlySeries,
      orderStatusBreakdown: breakdown,
    };
  }

  async getRecentOrders(limit = 10): Promise<RecentOrderItem[]> {
    const orders = await this.orderRepository.find({
      take: limit,
      order: { createdAt: 'DESC' },
      where: { status: OrderStatus.Completed },
      relations: ['user'],
    });

    return orders.map((o) => ({
      id: o.id,
      orderNumber: `#${(o.id || '').slice(0, 8).toUpperCase()}`,
      totalAmount: Number(o.totalAmount),
      currency: o.currency || 'SGD',
      status: o.status,
      createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : String(o.createdAt),
      userEmail: o.user?.email ?? undefined,
      userName: o.user
        ? [o.user.firstname, o.user.lastname].filter(Boolean).join(' ') || o.user.username || undefined
        : undefined,
    }));
  }

  async getTopRatedCourses(limit = 5): Promise<TopRatedCourseItem[]> {
    const rows = await this.reviewRepository
      .createQueryBuilder('r')
      .innerJoin(CourseEntity, 'c', 'c.id = r.courseId')
      .select('c.id', 'id')
      .addSelect('c.title', 'title')
      .addSelect('c.image', 'image')
      .addSelect('c.level', 'level')
      .addSelect('c.freeOrPaid', 'freeOrPaid')
      .addSelect('c.amount', 'amount')
      .addSelect('AVG(r.rating)', 'avgRating')
      .addSelect('COUNT(r.id)', 'ratingCount')
      .where('r.isCourse = :isCourse', { isCourse: true })
      .andWhere('r.courseId IS NOT NULL')
      .groupBy('c.id')
      .addGroupBy('c.title')
      .addGroupBy('c.image')
      .addGroupBy('c.level')
      .addGroupBy('c.freeOrPaid')
      .addGroupBy('c.amount')
      .orderBy('AVG(r.rating)', 'DESC')
      .addOrderBy('COUNT(r.id)', 'DESC')
      .limit(limit)
      .getRawMany<{
        id: string;
        title: string;
        image: string | null;
        level: string | null;
        freeOrPaid: boolean | null;
        amount: string | null;
        avgRating: string;
        ratingCount: string;
      }>();

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      image: row.image ?? undefined,
      level: row.level ?? undefined,
      freeOrPaid: row.freeOrPaid ?? undefined,
      amount: row.amount != null ? Number(row.amount) : undefined,
      avgRating: row.avgRating != null ? Number(row.avgRating) : 0,
      ratingCount: row.ratingCount != null ? Number(row.ratingCount) : 0,
    }));
  }

  private async buildSeriesForBuckets(buckets: TimeBucket[]) {
    const labels = buckets.map((b) => b.label);
    const rangeStart = buckets[0]?.start;
    const rangeEnd = buckets[buckets.length - 1]?.end;
    if (!rangeStart || !rangeEnd) {
      return {
        labels,
        users: labels.map(() => 0),
        courses: labels.map(() => 0),
        orders: labels.map(() => 0),
        revenue: labels.map(() => 0),
        enrollments: labels.map(() => 0),
      };
    }

    const [userRows, courseRows, orderRows, enrollmentRows] = await Promise.all([
      this.groupPlatformUsersByCreatedAt(rangeStart, rangeEnd),
      this.groupCountsByCreatedAt(this.courseRepository, 'course', rangeStart, rangeEnd),
      this.groupCompletedOrdersByCreatedAt(rangeStart, rangeEnd),
      this.groupCountsByCreatedAt(this.enrollmentRepository, 'enrollment', rangeStart, rangeEnd),
    ]);

    return {
      labels,
      users: this.rollUpBuckets(buckets, userRows, 'count'),
      courses: this.rollUpBuckets(buckets, courseRows, 'count'),
      orders: this.rollUpBuckets(buckets, orderRows, 'count'),
      revenue: this.rollUpBuckets(buckets, orderRows, 'revenue'),
      enrollments: this.rollUpBuckets(buckets, enrollmentRows, 'count'),
    };
  }

  private rollUpBuckets(
    buckets: TimeBucket[],
    rows: Array<{ bucket: string; count: number; revenue?: number }>,
    field: 'count' | 'revenue',
  ): number[] {
    return buckets.map((bucket) => {
      let total = 0;
      for (const row of rows) {
        const day = this.parseDayKey(row.bucket);
        if (!day) continue;
        if (day >= bucket.start && day < bucket.end) {
          total += field === 'revenue' ? row.revenue || 0 : row.count;
        }
      }
      return Math.round(total * 100) / 100;
    });
  }

  private async groupCountsByCreatedAt(
    repo: Repository<any>,
    alias: string,
    from: Date,
    to: Date,
  ): Promise<Array<{ bucket: string; count: number }>> {
    const rows = await repo
      .createQueryBuilder(alias)
      .select(`TO_CHAR(DATE_TRUNC('day', ${alias}.createdAt), 'YYYY-MM-DD')`, 'day')
      .addSelect('COUNT(*)', 'count')
      .where(`${alias}.createdAt >= :from AND ${alias}.createdAt < :to`, { from, to })
      .groupBy('day')
      .getRawMany<{ day: string; count: string }>();

    return rows.map((row) => ({
      bucket: row.day,
      count: this.toNumber(row.count),
    }));
  }

  private async groupCompletedOrdersByCreatedAt(
    from: Date,
    to: Date,
  ): Promise<Array<{ bucket: string; count: number; revenue: number }>> {
    const rows = await this.orderRepository
      .createQueryBuilder('o')
      .select(`TO_CHAR(DATE_TRUNC('day', o.createdAt), 'YYYY-MM-DD')`, 'day')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(o.totalAmount), 0)', 'revenue')
      .where('o.status = :status', { status: OrderStatus.Completed })
      .andWhere('o.createdAt >= :from AND o.createdAt < :to', { from, to })
      .groupBy('day')
      .getRawMany<{ day: string; count: string; revenue: string }>();

    return rows.map((row) => ({
      bucket: row.day,
      count: this.toNumber(row.count),
      revenue: this.toNumber(row.revenue),
    }));
  }

  private parseDayKey(value: string): Date | null {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private buildMonthBuckets(now: Date, count: number): TimeBucket[] {
    const buckets: TimeBucket[] = [];
    const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    for (let i = count - 1; i >= 0; i -= 1) {
      const start = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - i, 1));
      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
      buckets.push({
        key: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`,
        label: start.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
        start,
        end,
      });
    }
    return buckets;
  }

  private buildWeekBuckets(now: Date, count: number): TimeBucket[] {
    const buckets: TimeBucket[] = [];
    const endOfToday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
    );
    for (let i = count - 1; i >= 0; i -= 1) {
      const end = new Date(endOfToday.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      buckets.push({
        key: start.toISOString().slice(0, 10),
        label: start.toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
        start,
        end,
      });
    }
    return buckets;
  }

  /**
   * Same scope as the admin Users list: exclude Admin, Corporate, and draft signups.
   */
  private platformUsersQuery(): SelectQueryBuilder<UserEntity> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.role != :adminRole', { adminRole: UserRole.Admin })
      .andWhere('user.role != :corporateRole', { corporateRole: UserRole.Corporate })
      .andWhere('user.isDraft = :isDraft', { isDraft: false });
  }

  private async countPlatformUsers(): Promise<number> {
    return this.platformUsersQuery().getCount();
  }

  private async countPlatformUsersSince(from: Date): Promise<number> {
    return this.platformUsersQuery().andWhere('user.createdAt >= :from', { from }).getCount();
  }

  private async countPlatformUsersBetween(from: Date, to: Date): Promise<number> {
    return this.platformUsersQuery()
      .andWhere('user.createdAt >= :from AND user.createdAt < :to', { from, to })
      .getCount();
  }

  private async groupPlatformUsersByCreatedAt(
    from: Date,
    to: Date,
  ): Promise<Array<{ bucket: string; count: number }>> {
    const rows = await this.platformUsersQuery()
      .select(`TO_CHAR(DATE_TRUNC('day', user.createdAt), 'YYYY-MM-DD')`, 'day')
      .addSelect('COUNT(*)', 'count')
      .andWhere('user.createdAt >= :from AND user.createdAt < :to', { from, to })
      .groupBy('day')
      .getRawMany<{ day: string; count: string }>();

    return rows.map((row) => ({
      bucket: row.day,
      count: this.toNumber(row.count),
    }));
  }

  private async countSince(repo: Repository<any>, alias: string, from: Date): Promise<number> {
    return repo
      .createQueryBuilder(alias)
      .where(`${alias}.createdAt >= :from`, { from })
      .getCount();
  }

  private async countBetween(
    repo: Repository<any>,
    alias: string,
    from: Date,
    to: Date,
  ): Promise<number> {
    return repo
      .createQueryBuilder(alias)
      .where(`${alias}.createdAt >= :from AND ${alias}.createdAt < :to`, { from, to })
      .getCount();
  }

  private async countCompletedOrdersSince(from: Date): Promise<number> {
    return this.orderRepository
      .createQueryBuilder('o')
      .where('o.status = :status', { status: OrderStatus.Completed })
      .andWhere('o.createdAt >= :from', { from })
      .getCount();
  }

  private async countCompletedOrdersBetween(from: Date, to: Date): Promise<number> {
    return this.orderRepository
      .createQueryBuilder('o')
      .where('o.status = :status', { status: OrderStatus.Completed })
      .andWhere('o.createdAt >= :from AND o.createdAt < :to', { from, to })
      .getCount();
  }

  private async sumCompletedRevenueSince(from: Date) {
    return this.orderRepository
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.totalAmount), 0)', 'total')
      .where('o.status = :status', { status: OrderStatus.Completed })
      .andWhere('o.createdAt >= :from', { from })
      .getRawOne<{ total: string }>();
  }

  private async sumCompletedRevenueBetween(from: Date, to: Date) {
    return this.orderRepository
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.totalAmount), 0)', 'total')
      .where('o.status = :status', { status: OrderStatus.Completed })
      .andWhere('o.createdAt >= :from AND o.createdAt < :to', { from, to })
      .getRawOne<{ total: string }>();
  }

  private percentChange(current: number, previous: number): number {
    if (previous <= 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }

  private toNumber(value: string | number | null | undefined): number {
    if (value == null) return 0;
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
}
