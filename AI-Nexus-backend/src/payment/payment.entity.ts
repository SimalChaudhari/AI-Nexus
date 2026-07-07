import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserEntity } from '../user/users.entity';
import { OrderEntity } from '../order/order.entity';

/**
 * Canonical payment lifecycle statuses.
 * Keep these stable — payment flow is sensitive and historical rows must remain readable.
 */
export enum PaymentStatus {
  /** Checkout session created; waiting for customer / provider. */
  Pending = 'pending',
  /** Payment verified (webhook or confirm-payment). */
  Paid = 'paid',
  /** Provider reported failure (or non-cancel failure). */
  Failed = 'failed',
  /** Customer canceled / abandoned checkout. */
  Canceled = 'canceled',
  /** Webhook signature verification failed; not fulfilled from webhook. */
  WebhookVerificationFailed = 'webhook_verification_failed',
  /** Payment refunded (manual / future support). */
  Refunded = 'refunded',
}

/** How this payment row was last written (audit trail). */
export enum PaymentSource {
  Checkout = 'checkout',
  Webhook = 'webhook',
  ConfirmPayment = 'confirm_payment',
  MarkFailed = 'mark_failed',
  StatusReconcile = 'status_reconcile',
  Backfill = 'backfill',
}

@Entity('payments')
@Index(['userId'])
@Index(['status'])
@Index(['createdAt'])
@Index(['wooshpaySessionId'])
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  /** Linked order once fulfillment (or failed-order audit) creates one. */
  @Column({ type: 'uuid', nullable: true })
  orderId!: string | null;

  @ManyToOne(() => OrderEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'orderId' })
  order!: OrderEntity | null;

  /** Short WooshPay client_reference_id (unique per payment attempt). */
  @Column({ type: 'varchar', length: 512, unique: true })
  clientReferenceId!: string;

  @Column({ type: 'varchar', length: 50, default: PaymentStatus.Pending })
  status!: PaymentStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amount!: number;

  @Column({ type: 'varchar', length: 10, default: 'SGD' })
  currency!: string;

  /** Comma-separated course / purpose IDs (same shape as orders.courseIds). */
  @Column({ type: 'text' })
  courseIds!: string;

  /** Line items snapshot: JSON array of { id, name, price, quantity }. */
  @Column({ type: 'jsonb', nullable: true })
  items!: { id: string; name: string; price: number; quantity: number }[] | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  wooshpaySessionId!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  wooshpayPaymentIntentId!: string | null;

  /** e.g. membership-paid-signup, membership-application-billing, webhook event type. */
  @Column({ type: 'varchar', length: 100, nullable: true })
  eventType!: string | null;

  /** Last write path for audit (checkout, webhook, confirm_payment, …). */
  @Column({ type: 'varchar', length: 50, nullable: true })
  source!: PaymentSource | string | null;

  /** Human-readable failure detail when status is not paid. */
  @Column({ type: 'varchar', length: 512, nullable: true })
  failureReason!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  paidAt!: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
