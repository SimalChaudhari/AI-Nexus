import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { PaymentReferenceEntity } from './payment-reference.entity';

/** Generate a short URL-safe id for WooshPay client_reference_id (no UUIDs). */
function generateShortId(): string {
  return crypto.randomBytes(12).toString('base64url'); // 16 chars, A-Za-z0-9_-
}

export interface CreatePaymentReferenceParams {
  userId: string;
  courseIds: string[];
  items?: { id: string; name: string; price: number; quantity: number }[];
}

@Injectable()
export class PaymentReferenceService {
  constructor(
    @InjectRepository(PaymentReferenceEntity)
    private readonly repo: Repository<PaymentReferenceEntity>,
  ) {}

  async create(params: CreatePaymentReferenceParams): Promise<{ id: string }> {
    const id = generateShortId();
    const ref = this.repo.create({
      id,
      userId: params.userId,
      courseIds: params.courseIds.join(','),
      items: params.items ?? null,
    });
    await this.repo.save(ref);
    return { id };
  }

  async setSessionId(id: string, sessionId: string): Promise<void> {
    await this.repo.update({ id }, { wooshpaySessionId: sessionId });
  }

  async findById(id: string): Promise<{
    userId: string;
    courseIds: string[];
    items: { id: string; name: string; price: number; quantity: number }[] | null;
    wooshpaySessionId: string | null;
  } | null> {
    const ref = await this.repo.findOne({ where: { id } });
    if (!ref) return null;
    return {
      userId: ref.userId,
      courseIds: ref.courseIds.split(',').map((s) => s.trim()).filter(Boolean),
      items: ref.items,
      wooshpaySessionId: ref.wooshpaySessionId ?? null,
    };
  }
}
