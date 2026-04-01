import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderEntity, OrderStatus } from './order.entity';

export interface CreateOrderParams {
  userId: string;
  courseIds: string[];
  items?: { id: string; name: string; price: number; quantity: number }[];
  totalAmount: number;
  currency?: string;
  paymentStatus?: string;
  wooshpaySessionId?: string;
  wooshpayPaymentIntentId?: string;
  clientReferenceId: string;
  eventType?: string;
}

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
  ) {}

  async create(params: CreateOrderParams): Promise<OrderEntity> {
    const order = this.orderRepository.create({
      userId: params.userId,
      courseIds: params.courseIds.join(','),
      items: params.items ?? null,
      totalAmount: params.totalAmount,
      currency: (params.currency || 'SGD').toUpperCase(),
      status: OrderStatus.Completed,
      paymentStatus: params.paymentStatus ?? 'paid',
      wooshpaySessionId: params.wooshpaySessionId ?? null,
      wooshpayPaymentIntentId: params.wooshpayPaymentIntentId ?? null,
      clientReferenceId: params.clientReferenceId,
      eventType: params.eventType ?? null,
    });
    return this.orderRepository.save(order);
  }

  async findAll(): Promise<OrderEntity[]> {
    return this.orderRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<OrderEntity> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }
    return order;
  }

  /** Check if an order already exists for this payment reference (avoid duplicate on webhook + confirm). */
  async existsByClientReferenceId(clientReferenceId: string): Promise<boolean> {
    const count = await this.orderRepository.count({ where: { clientReferenceId } });
    return count > 0;
  }

  async findLatestByClientReferenceId(clientReferenceId: string): Promise<OrderEntity | null> {
    return this.orderRepository.findOne({
      where: { clientReferenceId },
      order: { createdAt: 'DESC' },
    });
  }

  /** Create a failed order (cancel/abandon or webhook verification failed). Idempotent: skips if order already exists. */
  async createFailedFromReference(
    clientReferenceId: string,
    ref: { userId: string; courseIds: string[]; items: { id: string; name: string; price: number; quantity: number }[] | null },
    paymentStatus: string = 'canceled',
  ): Promise<OrderEntity | null> {
    if (await this.existsByClientReferenceId(clientReferenceId)) return null;
    const totalAmount = ref.items?.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0) ?? 0;
    return this.orderRepository.save(
      this.orderRepository.create({
        userId: ref.userId,
        courseIds: ref.courseIds.join(','),
        items: ref.items,
        totalAmount,
        currency: 'SGD',
        status: OrderStatus.Failed,
        paymentStatus,
        clientReferenceId,
      }),
    );
  }

  async deleteById(id: string): Promise<void> {
    const result = await this.orderRepository.delete({ id });
    if (!result.affected) {
      throw new NotFoundException(`Order ${id} not found`);
    }
  }

  async deleteManyByIds(ids: string[]): Promise<number> {
    if (!ids.length) return 0;
    const result = await this.orderRepository.delete(ids);
    return result.affected ?? 0;
  }
}
