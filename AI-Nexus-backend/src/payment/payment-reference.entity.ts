import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('payment_references')
export class PaymentReferenceEntity {
  /** Short alphanumeric id sent to WooshPay (no UUIDs). */
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  /** Comma-separated course IDs */
  @Column({ type: 'text' })
  courseIds!: string;

  /** Snapshot of line items (name, price, quantity) for order display */
  @Column({ type: 'jsonb', nullable: true })
  items!: { id: string; name: string; price: number; quantity: number }[] | null;

  /** Last WooshPay checkout session id created for this reference */
  @Column({ type: 'varchar', length: 255, nullable: true })
  wooshpaySessionId!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
