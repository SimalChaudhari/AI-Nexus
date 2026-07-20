import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  PaymentEntity,
  PaymentSource,
  PaymentStatus,
} from './payment.entity';
import { AffiliateSaleEntity } from '../affiliate/affiliate-sale.entity';
import { PaginationService } from '../common/pagination/pagination.service';

export interface UpsertPaymentParams {
  userId: string;
  clientReferenceId: string;
  status: PaymentStatus;
  amount?: number;
  currency?: string;
  courseIds?: string[];
  items?: { id: string; name: string; price: number; quantity: number }[] | null;
  wooshpaySessionId?: string | null;
  wooshpayPaymentIntentId?: string | null;
  eventType?: string | null;
  source?: PaymentSource | string;
  failureReason?: string | null;
  orderId?: string | null;
  paidAt?: Date | null;
}

export type MembershipPaymentHistoryFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
};

/** Statuses that must not be overwritten by a weaker terminal state. */
const TERMINAL_SUCCESS = new Set<PaymentStatus>([PaymentStatus.Paid, PaymentStatus.Refunded]);

function normalizeStatus(value?: string | null): PaymentStatus {
  const status = String(value || '').trim().toLowerCase();
  switch (status) {
    case PaymentStatus.Paid:
    case 'complete':
    case 'completed':
      return PaymentStatus.Paid;
    case PaymentStatus.Canceled:
    case 'cancelled':
      return PaymentStatus.Canceled;
    case PaymentStatus.WebhookVerificationFailed:
      return PaymentStatus.WebhookVerificationFailed;
    case PaymentStatus.Refunded:
      return PaymentStatus.Refunded;
    case PaymentStatus.Pending:
    case 'processing':
      return PaymentStatus.Pending;
    case PaymentStatus.Failed:
    case 'expired':
    default:
      if (!status) return PaymentStatus.Pending;
      return PaymentStatus.Failed;
  }
}

function amountFromItems(
  items?: { id: string; name: string; price: number; quantity: number }[] | null,
): number {
  if (!items?.length) return 0;
  return items.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
    0,
  );
}

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: Repository<PaymentEntity>,
    @InjectRepository(AffiliateSaleEntity)
    private readonly affiliateSaleRepository: Repository<AffiliateSaleEntity>,
    private readonly paginationService: PaginationService,
  ) {}

  async findByClientReferenceId(clientReferenceId: string): Promise<PaymentEntity | null> {
    return this.paymentRepository.findOne({
      where: { clientReferenceId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<PaymentEntity | null> {
    return this.paymentRepository.findOne({ where: { id } });
  }

  /**
   * Create or update a payment row for a client reference.
   * Never downgrades a paid/refunded payment to a weaker status.
   */
  async upsertByClientReferenceId(params: UpsertPaymentParams): Promise<PaymentEntity> {
    const clientReferenceId = params.clientReferenceId.trim();
    const existing = await this.findByClientReferenceId(clientReferenceId);
    const nextStatus = normalizeStatus(params.status);

    if (existing && TERMINAL_SUCCESS.has(existing.status) && !TERMINAL_SUCCESS.has(nextStatus)) {
      return existing;
    }

    const courseIds =
      params.courseIds?.join(',') ??
      existing?.courseIds ??
      '';
    const items = params.items !== undefined ? params.items : existing?.items ?? null;
    const amount =
      params.amount !== undefined
        ? params.amount
        : existing
          ? Number(existing.amount)
          : amountFromItems(items);

    const paidAt =
      nextStatus === PaymentStatus.Paid
        ? params.paidAt ?? existing?.paidAt ?? new Date()
        : existing?.paidAt ?? null;

    if (existing) {
      existing.status = nextStatus;
      existing.amount = amount;
      existing.currency = (params.currency || existing.currency || 'SGD').toUpperCase();
      existing.courseIds = courseIds || existing.courseIds;
      existing.items = items;
      if (params.wooshpaySessionId !== undefined) {
        existing.wooshpaySessionId = params.wooshpaySessionId;
      }
      if (params.wooshpayPaymentIntentId !== undefined) {
        existing.wooshpayPaymentIntentId = params.wooshpayPaymentIntentId;
      }
      if (params.eventType !== undefined) {
        existing.eventType = params.eventType;
      }
      if (params.source !== undefined) {
        existing.source = params.source;
      }
      if (params.orderId !== undefined) {
        existing.orderId = params.orderId;
      }
      existing.failureReason =
        nextStatus === PaymentStatus.Paid
          ? null
          : params.failureReason !== undefined
            ? params.failureReason
            : existing.failureReason;
      existing.paidAt = paidAt;
      return this.paymentRepository.save(existing);
    }

    const payment = this.paymentRepository.create({
      userId: params.userId,
      clientReferenceId,
      status: nextStatus,
      amount,
      currency: (params.currency || 'SGD').toUpperCase(),
      courseIds,
      items,
      wooshpaySessionId: params.wooshpaySessionId ?? null,
      wooshpayPaymentIntentId: params.wooshpayPaymentIntentId ?? null,
      eventType: params.eventType ?? null,
      source: params.source ?? null,
      failureReason: nextStatus === PaymentStatus.Paid ? null : params.failureReason ?? null,
      orderId: params.orderId ?? null,
      paidAt,
    });
    return this.paymentRepository.save(payment);
  }

  async recordPending(params: {
    userId: string;
    clientReferenceId: string;
    courseIds: string[];
    items?: { id: string; name: string; price: number; quantity: number }[] | null;
    amount?: number;
    currency?: string;
    wooshpaySessionId?: string | null;
    eventType?: string | null;
  }): Promise<PaymentEntity> {
    return this.upsertByClientReferenceId({
      userId: params.userId,
      clientReferenceId: params.clientReferenceId,
      status: PaymentStatus.Pending,
      amount: params.amount ?? amountFromItems(params.items),
      currency: params.currency,
      courseIds: params.courseIds,
      items: params.items ?? null,
      wooshpaySessionId: params.wooshpaySessionId ?? null,
      eventType: params.eventType ?? params.courseIds[0] ?? null,
      source: PaymentSource.Checkout,
    });
  }

  async recordPaid(params: {
    userId: string;
    clientReferenceId: string;
    orderId?: string | null;
    amount?: number;
    currency?: string;
    courseIds?: string[];
    items?: { id: string; name: string; price: number; quantity: number }[] | null;
    wooshpaySessionId?: string | null;
    wooshpayPaymentIntentId?: string | null;
    eventType?: string | null;
    source?: PaymentSource | string;
  }): Promise<PaymentEntity> {
    return this.upsertByClientReferenceId({
      ...params,
      status: PaymentStatus.Paid,
      source: params.source ?? PaymentSource.ConfirmPayment,
      failureReason: null,
      paidAt: new Date(),
    });
  }

  async recordFailed(params: {
    userId: string;
    clientReferenceId: string;
    status?: PaymentStatus | string;
    orderId?: string | null;
    amount?: number;
    currency?: string;
    courseIds?: string[];
    items?: { id: string; name: string; price: number; quantity: number }[] | null;
    wooshpaySessionId?: string | null;
    eventType?: string | null;
    source?: PaymentSource | string;
    failureReason?: string | null;
  }): Promise<PaymentEntity> {
    const status = normalizeStatus(params.status ?? PaymentStatus.Failed);
    const safeStatus =
      status === PaymentStatus.Paid || status === PaymentStatus.Pending
        ? PaymentStatus.Failed
        : status;

    return this.upsertByClientReferenceId({
      ...params,
      status: safeStatus,
      source: params.source ?? PaymentSource.MarkFailed,
      failureReason: params.failureReason ?? safeStatus,
    });
  }

  /**
   * Admin membership payment history: payments + optional promo/sale details.
   */
  async listMembershipPaymentHistory(filters: MembershipPaymentHistoryFilters = {}) {
    const { page, limit, search, hasSearch } = this.paginationService.normalizePaginatedQuery(
      {
        page: filters.page,
        limit: filters.limit,
        search: filters.search,
      },
      10,
      100,
    );

    const qb = this.paymentRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.user', 'user')
      .where('(p.eventType ILIKE :membership OR p.courseIds ILIKE :membership)', {
        membership: 'membership%',
      });

    const status = String(filters.status || '').trim().toLowerCase();
    if (status && status !== 'all') {
      qb.andWhere('LOWER(p.status) = :status', { status });
    }

    if (hasSearch) {
      const term = `%${search}%`;
      qb.andWhere(
        `(
          user.email ILIKE :term
          OR user.firstname ILIKE :term
          OR user.lastname ILIKE :term
          OR p.clientReferenceId ILIKE :term
          OR p.wooshpaySessionId ILIKE :term
          OR EXISTS (
            SELECT 1 FROM affiliate_sales sx
            WHERE sx."paymentRefId" = p."clientReferenceId"
              AND (
                sx."voucherCode" ILIKE :term
                OR sx."affiliateCode" ILIKE :term
              )
          )
        )`,
        { term },
      );
    }

    qb.orderBy('p.createdAt', 'DESC');

    const totalItems = await qb.clone().getCount();
    const rows = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const refIds = rows
      .map((row) => String(row.clientReferenceId || '').trim())
      .filter(Boolean);

    const sales = refIds.length
      ? await this.affiliateSaleRepository.find({
          where: { paymentRefId: In(refIds) },
        })
      : [];
    const saleByRef = new Map(
      sales.map((sale) => [String(sale.paymentRefId || '').trim(), sale]),
    );

    const data = rows.map((payment) =>
      this.serializeMembershipPaymentHistoryItem(
        payment,
        saleByRef.get(String(payment.clientReferenceId || '').trim()),
      ),
    );

    return this.paginationService.buildPaginatedResponse(
      data,
      page,
      limit,
      totalItems,
      hasSearch ? search : null,
      undefined,
    );
  }

  async getMembershipPaymentHistoryById(id: string) {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!payment) {
      return null;
    }

    const isMembership =
      String(payment.eventType || '').toLowerCase().startsWith('membership')
      || String(payment.courseIds || '').toLowerCase().startsWith('membership');
    if (!isMembership) {
      return null;
    }

    const sale = payment.clientReferenceId
      ? await this.affiliateSaleRepository.findOne({
          where: { paymentRefId: payment.clientReferenceId },
        })
      : null;

    return this.serializeMembershipPaymentHistoryItem(payment, sale || undefined);
  }

  private serializeMembershipPaymentHistoryItem(
    payment: PaymentEntity,
    sale?: AffiliateSaleEntity | null,
  ) {
    const originalAmount = sale
      ? Number(sale.originalAmount)
      : Number(payment.amount);
    const payableAmount = sale
      ? Number(sale.payableAmount)
      : Number(payment.amount);
    const discountApplied =
      Boolean(sale?.discountApplied)
      || String(payment.courseIds || '').includes('promo');
    const discountAmount = Math.max(0, Number((originalAmount - payableAmount).toFixed(2)));
    const user = payment.user;
    const fullName = [user?.firstname, user?.lastname].filter(Boolean).join(' ').trim();

    return {
      id: payment.id,
      paymentRef: payment.clientReferenceId,
      status: payment.status,
      currency: payment.currency || 'SGD',
      amount: Number(payment.amount) || 0,
      originalAmount: Number.isFinite(originalAmount) ? originalAmount : Number(payment.amount) || 0,
      payableAmount: Number.isFinite(payableAmount) ? payableAmount : Number(payment.amount) || 0,
      discountApplied,
      discountAmount,
      voucherCode: sale?.voucherCode || null,
      affiliateCode: sale?.affiliateCode || null,
      eventType: payment.eventType || null,
      pricingType: String(payment.courseIds || '').includes('membership-verified')
        ? 'verified'
        : discountApplied
          ? 'promo'
          : 'standard',
      courseIds: payment.courseIds || null,
      items: payment.items || null,
      source: payment.source || null,
      userId: payment.userId,
      email: user?.email || null,
      name: fullName || null,
      username: user?.username || null,
      wooshpaySessionId: payment.wooshpaySessionId || null,
      wooshpayPaymentIntentId: payment.wooshpayPaymentIntentId || null,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      failureReason: payment.failureReason || null,
    };
  }
}
