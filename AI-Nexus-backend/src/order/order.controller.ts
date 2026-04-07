import { Controller, Get, Delete, Param, Body, UseGuards, HttpStatus, Res, BadRequestException, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { RolesGuard } from '../jwt/roles.guard';
import { Roles } from '../jwt/roles.decorator';
import { UserRole } from '../user/users.entity';
import { SessionGuard } from '../jwt/session.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Orders')
@ApiBearerAuth('bearer')
@Controller('orders')
@UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  private toUtcIso(value: Date | string | null | undefined): string | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  }

  private toEpochMs(value: Date | string | null | undefined): number | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.getTime();
  }

  @Get()
  @ApiOperation({ summary: 'List all orders' })
  async list(@Res() res: Response) {
    const orders = await this.orderService.findAll();
    return res.status(HttpStatus.OK).json({
      length: orders.length,
      data: orders.map((o) => ({
        id: o.id,
        orderNumber: `#${o.id.slice(0, 8)}`,
        userId: o.userId,
        user: o.user
          ? {
              id: o.user.id,
              name: `${(o.user as any).firstname ?? ''} ${(o.user as any).lastname ?? ''}`.trim() || (o.user as any).email,
              email: (o.user as any).email,
            }
          : null,
        courseIds: o.courseIds.split(',').filter(Boolean),
        items: o.items,
        totalAmount: Number(o.totalAmount),
        currency: o.currency,
        status: o.status,
        paymentStatus: o.paymentStatus,
        wooshpaySessionId: o.wooshpaySessionId,
        clientReferenceId: o.clientReferenceId,
        eventType: o.eventType,
        createdAt: o.createdAt,
        createdAtUtc: this.toUtcIso(o.createdAt),
        createdAtMs: this.toEpochMs(o.createdAt),
      })),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details by id' })
  async getById(@Param('id') id: string, @Res() res: Response) {
    const order = await this.orderService.findOne(id);
    const user = order.user as any;
    return res.status(HttpStatus.OK).json({
      data: {
        id: order.id,
        orderNumber: `#${order.id.slice(0, 8)}`,
        userId: order.userId,
        customer: user
          ? {
              id: user.id,
              name: `${user.firstname ?? ''} ${user.lastname ?? ''}`.trim() || user.email,
              email: user.email,
            }
          : null,
        courseIds: order.courseIds.split(',').filter(Boolean),
        items: order.items,
        totalAmount: Number(order.totalAmount),
        currency: order.currency,
        status: order.status,
        paymentStatus: order.paymentStatus,
        wooshpaySessionId: order.wooshpaySessionId,
        wooshpayPaymentIntentId: order.wooshpayPaymentIntentId,
        clientReferenceId: order.clientReferenceId,
        eventType: order.eventType,
        createdAt: order.createdAt,
        createdAtUtc: this.toUtcIso(order.createdAt),
        createdAtMs: this.toEpochMs(order.createdAt),
      },
    });
  }

  @Get(':id/receipt/pdf')
  @ApiOperation({ summary: 'Download order receipt PDF (admin)' })
  async downloadReceiptPdf(@Param('id') id: string, @Res() res: Response) {
    const { filename, buffer, order } = await this.orderService.generateReceiptPdfBuffer(id);
    if (order.status !== 'completed') {
      throw new BadRequestException('Receipt PDF is only available for successful/completed orders');
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(HttpStatus.OK).send(buffer);
  }

  @Get('my/course/:courseId/receipt/pdf')
  @Roles(UserRole.User, UserRole.Admin)
  @ApiOperation({ summary: 'Download receipt PDF for current user by course id' })
  async downloadMyCourseReceiptPdf(
    @Param('courseId') courseId: string,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    const userId = request.user?.id;
    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'User not authenticated' });
    }
    const { filename, buffer, order } = await this.orderService.generateReceiptPdfBufferForUserCourse(userId, courseId);
    if (order.status !== 'completed') {
      throw new BadRequestException('Receipt PDF is only available for successful/completed orders');
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(HttpStatus.OK).send(buffer);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete one order by id' })
  async deleteById(@Param('id') id: string, @Res() res: Response) {
    await this.orderService.deleteById(id);
    return res.status(HttpStatus.OK).json({ message: 'Order deleted successfully' });
  }

  @Delete()
  @ApiOperation({ summary: 'Delete multiple orders by ids' })
  async deleteMany(@Body() body: { ids?: string[] }, @Res() res: Response) {
    const ids = Array.isArray(body?.ids) ? body.ids.filter(Boolean) : [];
    if (!ids.length) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'ids is required' });
    }
    const deletedCount = await this.orderService.deleteManyByIds(ids);
    return res.status(HttpStatus.OK).json({
      message: 'Orders deleted successfully',
      deletedCount,
    });
  }
}
