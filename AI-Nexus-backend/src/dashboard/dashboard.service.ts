import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../user/users.entity';
import { CourseEntity } from '../course/courses.entity';
import { OrderEntity, OrderStatus } from '../order/order.entity';
import { ReviewEntity } from '../review/review.entity';

export interface DashboardStats {
  totalUsers: number;
  totalCourses: number;
  totalOrders: number;
  totalRevenue: number;
  completedOrders: number;
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
  ) {}

  async getStats(): Promise<DashboardStats> {
    const [totalUsers, totalCourses, totalOrders, completedOrders, revenueRow] = await Promise.all([
      this.userRepository.count(),
      this.courseRepository.count(),
      this.orderRepository.count(),
      this.orderRepository.count({ where: { status: OrderStatus.Completed } }),
      this.orderRepository
        .createQueryBuilder('o')
        .select('COALESCE(SUM(o.totalAmount), 0)', 'total')
        .where('o.status = :status', { status: OrderStatus.Completed })
        .getRawOne<{ total: string }>(),
    ]);

    const totalRevenue = revenueRow?.total != null ? Number(revenueRow.total) : 0;

    return {
      totalUsers,
      totalCourses,
      totalOrders,
      totalRevenue,
      completedOrders,
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
}
