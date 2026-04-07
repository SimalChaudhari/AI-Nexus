import { Controller, Post, Get, Query, Body, Req, Res, HttpStatus, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { WooshPayService } from './wooshpay.service';
import { CreateCheckoutDto } from './create-checkout.dto';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { CourseEnrollmentService } from '../course/course-enrollment.service';
import { OrderService } from '../order/order.service';
import { PaymentReferenceService } from './payment-reference.service';
import { UserService } from '../user/users.service';
import { CourseService } from '../course/courses.service';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(
    private readonly wooshPayService: WooshPayService,
    private readonly courseEnrollmentService: CourseEnrollmentService,
    private readonly courseService: CourseService,
    private readonly orderService: OrderService,
    private readonly paymentReferenceService: PaymentReferenceService,
    private readonly userService: UserService,
  ) {}

  @Post('create-checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Create checkout session for cart items' })
  @ApiBody({ type: CreateCheckoutDto })
  async createCheckout(
    @Body() dto: CreateCheckoutDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.handleCreateCheckout(req, res, dto, false);
  }

  /** Card-only checkout: WooshPay will show only card payment option. */
  @Post('create-checkout-cards')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Create card-only checkout session' })
  @ApiBody({ type: CreateCheckoutDto })
  async createCheckoutCards(
    @Body() dto: CreateCheckoutDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.handleCreateCheckout(req, res, dto, true);
  }

  private async handleCreateCheckout(
    req: Request,
    res: Response,
    dto: CreateCheckoutDto,
    cardsOnly: boolean,
  ) {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
    }

    let user: { email?: string; firstname?: string; lastname?: string };
    try {
      user = await this.userService.getById(userId);
    } catch {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: 'User not found. Please sign in again.',
      });
    }

    if (!dto.items?.length) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Cart is empty' });
    }

    const courseIds = dto.items.map((i) => i.id).filter(Boolean);
    if (courseIds.length > 0) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const invalidFormat = courseIds.filter((id) => typeof id !== 'string' || !uuidRegex.test(id.trim()));
      if (invalidFormat.length > 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Each course id must be a valid UUID (e.g. from your courses table).',
          invalidIds: invalidFormat,
        });
      }
      const { missing } = await this.courseService.findExistingIds(courseIds);
      if (missing.length > 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Course not found. Use course ids from your database.',
          invalidIds: missing,
        });
      }
    }

    const currency = (dto.currency || 'SGD').toUpperCase();
    // Courses: always quantity 1 per line item
    const line_items = dto.items.map((item) => ({
      price_data: {
        currency,
        unit_amount: Math.round((Number(item.price) || 0) * 100),
        product_data: {
          name: item.name || 'Course',
          description: `Course purchase`,
        },
      },
      quantity: 1,
    }));

    const itemsSnapshot = dto.items.map((i) => ({
      id: i.id,
      name: i.name || 'Course',
      price: Number(i.price) || 0,
      quantity: 1,
    }));
    // Store userId + courseIds in DB and send only a short reference to WooshPay (UUIDs can break payment)
    const { id: refId } = await this.paymentReferenceService.create({
      userId,
      courseIds,
      items: itemsSnapshot,
    });

    const successUrl =
      dto.successUrl ??
      process.env.PAYMENT_SUCCESS_URL?.trim() ??
      'http://localhost:3030/product/checkout/success';
    const cancelUrl =
      dto.cancelUrl ??
      process.env.PAYMENT_CANCEL_URL?.trim() ??
      'http://localhost:3030/product/checkout';
    let finalSuccessUrl = successUrl;
    finalSuccessUrl = `${finalSuccessUrl}${finalSuccessUrl.includes('?') ? '&' : '?'}ref=${refId}`;
    let finalCancelUrl = cancelUrl;
    finalCancelUrl = `${finalCancelUrl}${finalCancelUrl.includes('?') ? '&' : '?'}payment=canceled&ref=${refId}`;

    const customerName = [user.firstname, user.lastname].filter(Boolean).join(' ') || undefined;
    try {
      const session = await this.wooshPayService.createCheckoutSession({
        line_items,
        success_url: finalSuccessUrl,
        cancel_url: finalCancelUrl,
        client_reference_id: refId,
        ...(user.email && { customer_email: user.email }),
        ...((customerName || user.email) && {
          payment_intent_data: {
            billing_details: {
              ...(customerName && { name: customerName }),
              ...(user.email && { email: user.email }),
            },
          },
        }),
        ...(cardsOnly && { payment_method_types: ['card'] }),
      });

      console.log('[Payments] Create checkout SUCCESS | userId=', userId, 'refId=', refId, 'sessionId=', session.id, 'success_url=', finalSuccessUrl?.split('?')[0], 'cancel_url=', finalCancelUrl?.split('?')[0], 'checkout_link=', session.url ? `${session.url.slice(0, 50)}...` : '(none)');
      await this.paymentReferenceService.setSessionId(refId, session.id);
      return res.status(HttpStatus.OK).json({
        url: session.url,
        sessionId: session.id,
        refId,
      });
    } catch (err: any) {
      const msg = err?.message || 'Failed to create checkout session';
      console.error('[Payments] Create checkout FAILED | userId=', userId, 'error=', msg);

      const isWooshPay5xx = typeof msg === 'string' && (msg.includes('500') || msg.includes('temporary problem'));
      const showRealError = process.env.PAYMENT_DEBUG !== 'false';
      const userMessage = isWooshPay5xx && !showRealError
        ? 'Payment service is temporarily unavailable. Please try again in a few minutes.'
        : msg;
      const status = isWooshPay5xx && !showRealError ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.INTERNAL_SERVER_ERROR;
      return res.status(status).json({ message: userMessage });
    }
  }

  /**
   * Mark payment as failed when user returns from WooshPay without completing (cancel/back).
   * Creates an order with status Failed for the given reference (idempotent).
   */
  @Post('mark-failed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Mark a payment reference as failed' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['ref'],
      properties: {
        ref: { type: 'string', description: 'Payment reference id' },
      },
    },
  })
  async markFailed(@Body() body: { ref?: string }, @Req() req: Request, @Res() res: Response) {
    const refId = body?.ref?.trim();
    if (!refId) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'ref is required' });
    }
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
    }
    const ref = await this.paymentReferenceService.findById(refId);
    if (!ref) {
      console.log('[Payments] Mark-failed FAILED | ref not found, refId=', refId);
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'Payment reference not found' });
    }
    if (ref.userId !== userId) {
      console.log('[Payments] Mark-failed FAILED | userId mismatch, refId=', refId);
      return res.status(HttpStatus.FORBIDDEN).json({ message: 'Not your payment reference' });
    }

    // Safety check: verify provider session before marking failed.
    // If payment is already complete, fulfill instead of creating a failed order.
    if (ref.wooshpaySessionId) {
      try {
        const session = await this.wooshPayService.getSession(ref.wooshpaySessionId);
        const paid = session?.payment_status === 'paid' || session?.status === 'complete';
        if (paid) {
          const result = await this.fulfillPayment(refId, {
            payment_status: session.payment_status ?? 'paid',
            amount_total: session.amount_total,
            currency: session.currency,
            id: session.id,
          });
          console.log('[Payments] Mark-failed SAFETY | payment already complete, fulfilled instead | refId=', refId, 'orderId=', result?.orderId, 'alreadyProcessed=', result?.alreadyProcessed);
          return res.status(HttpStatus.OK).json({
            created: false,
            message: 'Payment already completed; order fulfilled',
            alreadyProcessed: result?.alreadyProcessed ?? false,
            orderId: result?.orderId,
          });
        }
      } catch (err: any) {
        console.error('[Payments] Mark-failed SAFETY CHECK FAILED | refId=', refId, 'error=', err?.message);
        return res.status(HttpStatus.CONFLICT).json({
          message: 'Could not verify payment status. Please retry in a moment.',
        });
      }
    }

    const order = await this.orderService.createFailedFromReference(refId, ref);
    console.log('[Payments] Mark-failed SUCCESS | refId=', refId, 'orderCreated=', !!order, 'orderId=', order?.id ?? '(already existed)');
    return res.status(HttpStatus.OK).json({ created: !!order, message: order ? 'Order marked as failed' : 'Order already exists' });
  }

  /**
   * Confirm payment after redirect (success page). Uses sessionId to fetch session from WooshPay,
   * then enrolls user and creates order if not already done by webhook.
   */
  @Post('confirm-payment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Confirm payment after successful redirect' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['sessionId'],
      properties: {
        sessionId: { type: 'string', description: 'WooshPay session id' },
      },
    },
  })
  async confirmPayment(
    @Body() body: { sessionId?: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const sessionId = body?.sessionId?.trim();
    if (!sessionId) {
      console.log('[Payments] Confirm-payment FAILED | sessionId missing');
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'sessionId is required' });
    }
    try {
      const session = await this.wooshPayService.getSession(sessionId);
      const clientRef = session?.client_reference_id;
      if (!clientRef) {
        console.log('[Payments] Confirm-payment FAILED | invalid session or no reference, sessionId=', sessionId?.slice(0, 20));
        return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Invalid session or no reference' });
      }
      const paid = session.payment_status === 'paid' || session.status === 'complete';
      if (!paid) {
        console.log('[Payments] Confirm-payment FAILED | payment not completed, sessionId=', sessionId?.slice(0, 20), 'status=', session?.status, 'payment_status=', session?.payment_status);
        return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Payment not completed yet' });
      }
      const result = await this.fulfillPayment(clientRef, {
        payment_status: session.payment_status ?? 'paid',
        amount_total: session.amount_total,
        currency: session.currency,
        id: session.id,
      });
      console.log('[Payments] Confirm-payment SUCCESS | sessionId=', sessionId?.slice(0, 20), 'clientRef=', clientRef?.slice(0, 20), 'orderId=', result?.orderId, 'alreadyProcessed=', result?.alreadyProcessed);
      return res.status(HttpStatus.OK).json({
        success: true,
        orderId: result?.orderId,
        alreadyProcessed: result?.alreadyProcessed,
      });
    } catch (err: any) {
      console.error('[Payments] Confirm-payment FAILED | sessionId=', sessionId?.slice(0, 20), 'error=', err?.message);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: err?.message || 'Failed to confirm payment',
      });
    }
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get payment status by reference id' })
  async getPaymentStatus(
    @Query('ref') refId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const trimmedRef = (refId || '').trim();
    if (!trimmedRef) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'ref is required' });
    }

    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
    }

    const ref = await this.paymentReferenceService.findById(trimmedRef);
    if (!ref) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'Payment reference not found' });
    }
    if (ref.userId !== userId) {
      return res.status(HttpStatus.FORBIDDEN).json({ message: 'Not your payment reference' });
    }

    // First prefer DB finalized state (webhook/confirm already processed).
    const existingOrder = await this.orderService.findLatestByClientReferenceId(trimmedRef);
    if (existingOrder) {
      const failed =
        existingOrder.status === 'failed' ||
        existingOrder.status === 'cancelled' ||
        existingOrder.status === 'refunded';
      const success =
        existingOrder.status === 'completed' &&
        (existingOrder.paymentStatus === 'paid' || !existingOrder.paymentStatus);

      return res.status(HttpStatus.OK).json({
        state: success ? 'success' : failed ? 'failed' : 'processing',
        finalized: success || failed,
        orderId: existingOrder.id,
        orderStatus: existingOrder.status,
        paymentStatus: existingOrder.paymentStatus,
      });
    }

    // If no order yet, reconcile with provider session status to avoid stale "processing" forever.
    if (ref.wooshpaySessionId) {
      try {
        const session = await this.wooshPayService.getSession(ref.wooshpaySessionId);
        const paid = session?.payment_status === 'paid' || session?.status === 'complete';
        const definitelyFailed =
          session?.payment_status === 'failed' ||
          session?.payment_status === 'canceled' ||
          session?.status === 'expired' ||
          session?.status === 'canceled';

        if (paid) {
          const result = await this.fulfillPayment(trimmedRef, {
            payment_status: session.payment_status ?? 'paid',
            amount_total: session.amount_total,
            currency: session.currency,
            id: session.id,
          });
          return res.status(HttpStatus.OK).json({
            state: 'success',
            finalized: true,
            orderId: result?.orderId,
            paymentStatus: session.payment_status ?? 'paid',
          });
        }

        if (definitelyFailed) {
          const failedOrder = await this.orderService.createFailedFromReference(
            trimmedRef,
            ref,
            session?.payment_status || session?.status || 'failed',
          );
          return res.status(HttpStatus.OK).json({
            state: 'failed',
            finalized: true,
            orderId: failedOrder?.id,
            paymentStatus: session?.payment_status || session?.status || 'failed',
          });
        }
      } catch (err: any) {
        console.error('[Payments] Status reconcile FAILED | refId=', trimmedRef, 'error=', err?.message);
      }
    }

    return res.status(HttpStatus.OK).json({
      state: 'processing',
      finalized: false,
    });
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Receive payment provider webhook events' })
  async webhook(@Req() req: Request, @Res() res: Response) {
    const rawBody = (req as any).rawBody ?? JSON.stringify(req.body);
    const signatureHeader = req.headers['signature'] ?? req.headers['Signature'];
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET?.trim();
    console.log('webhookSecret', webhookSecret);
    const skipVerify = process.env.PAYMENT_WEBHOOK_VERIFY === 'false' || process.env.PAYMENT_WEBHOOK_VERIFY === '0';
    const isProduction = process.env.NODE_ENV === 'production';
    const acceptUnverifiedEnv = process.env.PAYMENT_WEBHOOK_ACCEPT_UNVERIFIED === 'true' || process.env.PAYMENT_WEBHOOK_ACCEPT_UNVERIFIED === '1';
    const acceptUnverified = !isProduction && acceptUnverifiedEnv;

    if (webhookSecret && !skipVerify) {
      const sig = String(signatureHeader || '');
      const verified = this.wooshPayService.verifyWebhookSignature(rawBody, sig);
      if (!verified) {
        if (acceptUnverified) {
          console.warn('[Payments] Webhook VERIFICATION FAILED but accepting (TEST) | eventType=from_body_below');
        } else {
          console.error('[Payments] Webhook VERIFICATION FAILED | payment REFUSED, failed order recorded. Fix PAYMENT_WEBHOOK_SECRET.');
          await this.recordFailedOrderOnVerificationFailure(rawBody);
          return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Webhook signature verification failed' });
        }
      } else {
        console.log('[Payments] Webhook signature VERIFIED');
      }
    } else if (skipVerify && webhookSecret) {
      console.warn('[Payments] Webhook verification DISABLED (dev only)');
    }

    type WebhookObject = {
      client_reference_id?: string;
      payment_status?: string;
      status?: string;
      amount_total?: number;
      amount_subtotal?: number;
      currency?: string;
      id?: string;
      payment_intent?: string;
    };
    let event: { type?: string; data?: { object?: WebhookObject }; object?: WebhookObject; id?: string };
    try {
      event = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    } catch {
      return res.status(HttpStatus.BAD_REQUEST).send('Invalid JSON');
    }

    const obj = event?.data?.object ?? event?.object;
    const eventType = event?.type ?? '';
    const paid =
      eventType === 'payment_intent.succeeded' ||
      eventType === 'checkout.session.completed' ||
      obj?.payment_status === 'paid' ||
      obj?.status === 'complete';

    console.log('[Payments] Webhook received | eventType=', eventType, 'paid=', paid);

    if (paid && obj) {
      const clientRef =
        (obj as any).client_reference_id ??
        (obj as any).merchant_order_id ??
        (obj as any).metadata?.client_reference_id ??
        (obj as any).metadata?.checkout_id;
      if (clientRef) {
        try {
          await this.fulfillPayment(clientRef, obj);
          console.log('[Payments] Webhook PAYMENT SUCCESS | order created/enrolled, clientRef=', String(clientRef).slice(0, 30));
        } catch (e) {
          console.error('[Payments] Webhook PAYMENT SUCCESS but fulfill FAILED | clientRef=', String(clientRef).slice(0, 30), 'error=', (e as Error)?.message);
        }
      } else {
        const keys = obj ? Object.keys(obj) : [];
        const metaKeys = (obj as any)?.metadata && typeof (obj as any).metadata === 'object' ? Object.keys((obj as any).metadata) : [];
        console.warn('[Payments] Webhook PAYMENT SUCCESS but no client_reference_id | eventType=', eventType, 'objectKeys=', keys.join(','), 'metadataKeys=', metaKeys.join(',') || '(none)');
      }
    } else {
      console.log('[Payments] Webhook event ignored (not paid) | eventType=', eventType);
    }

    return res.status(HttpStatus.OK).json({ received: true });
  }

  /**
   * Enroll user in courses and create order. Idempotent: skips if order already exists for this clientReferenceId.
   */
  private async fulfillPayment(
    clientRef: string,
    obj: {
      payment_status?: string;
      amount_total?: number;
      amount_subtotal?: number;
      currency?: string;
      id?: string;
      payment_intent?: string;
    },
  ): Promise<{ orderId?: string; alreadyProcessed?: boolean }> {
    let userId = '';
    let courseIds: string[] = [];
    let itemsSnapshot: { id: string; name: string; price: number; quantity: number }[] | null = null;

    const ref = await this.paymentReferenceService.findById(clientRef);
    if (ref) {
      userId = ref.userId;
      courseIds = ref.courseIds;
      itemsSnapshot = ref.items;
    } else {
      const pipe = clientRef.indexOf('|');
      if (pipe !== -1) {
        userId = clientRef.slice(0, pipe).trim();
        courseIds = clientRef.slice(pipe + 1).split(',').map((id) => id.trim()).filter(Boolean);
      } else {
        try {
          const parsed = JSON.parse(clientRef) as { userId?: string; courseIds?: string[] };
          if (parsed?.userId && Array.isArray(parsed?.courseIds)) {
            userId = parsed.userId;
            courseIds = parsed.courseIds;
          }
        } catch {
          // ignore
        }
      }
    }

    if (!userId || courseIds.length === 0) {
      console.warn('[Payments] Fulfill SKIP | no userId or courseIds for clientRef=', clientRef?.slice(0, 20));
      return {};
    }

    const alreadyProcessed = await this.orderService.existsByClientReferenceId(clientRef);
    if (alreadyProcessed) {
      console.log('[Payments] Fulfill SKIP | order already exists (idempotent), clientRef=', clientRef?.slice(0, 20));
      return { alreadyProcessed: true };
    }

    await this.courseEnrollmentService.enrollMany(userId, courseIds);

    let amountInUnits = 0;
    const amountTotal = obj?.amount_total ?? obj?.amount_subtotal ?? 0;
    if (typeof amountTotal === 'number' && amountTotal > 0) {
      amountInUnits = amountTotal / 100;
    } else if (itemsSnapshot?.length) {
      amountInUnits = itemsSnapshot.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
    }

    const order = await this.orderService.create({
      userId,
      courseIds,
      items: itemsSnapshot ?? undefined,
      totalAmount: amountInUnits,
      currency: (obj?.currency ?? 'SGD').toUpperCase(),
      paymentStatus: obj?.payment_status ?? 'paid',
      wooshpaySessionId: obj?.id ?? undefined,
      wooshpayPaymentIntentId: obj?.payment_intent ?? undefined,
      clientReferenceId: clientRef,
      eventType: undefined,
    });

    console.log('[Payments] Fulfill SUCCESS | orderId=', order.id, 'userId=', userId, 'clientRef=', clientRef?.slice(0, 20));
    return { orderId: order.id };
  }

  /**
   * When webhook signature verification fails: record a failed order for audit (if we have the ref in DB).
   * Does not enroll user. Refund must be done manually from WooshPay dashboard if needed.
   */
  private async recordFailedOrderOnVerificationFailure(rawBody: string): Promise<void> {
    try {
      const event = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
      const obj = event?.data?.object ?? event?.object;
      const clientRef =
        (obj as any)?.client_reference_id ??
        (obj as any)?.merchant_order_id ??
        (obj as any)?.metadata?.client_reference_id ??
        (obj as any)?.metadata?.checkout_id;
      if (!clientRef || typeof clientRef !== 'string') return;
      const ref = await this.paymentReferenceService.findById(clientRef.trim());
      if (ref) {
        const failedOrder = await this.orderService.createFailedFromReference(clientRef.trim(), ref, 'webhook_verification_failed');
        console.log('[Payments] Webhook VERIFICATION FAILED | failed order recorded, orderId=', failedOrder?.id, 'clientRef=', String(clientRef).slice(0, 20));
      } else {
        console.log('[Payments] Webhook VERIFICATION FAILED | no ref in DB for clientRef=', String(clientRef).slice(0, 20));
      }
    } catch (e) {
      console.error('[Payments] Webhook VERIFICATION FAILED | could not record failed order, error=', (e as Error)?.message);
    }
  }
}
