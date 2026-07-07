import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { SessionGuard } from '../jwt/session.guard';
import { NotificationService } from './notification.service';
import { PushService } from './push.service';
import { PushSubscribeDto, PushUnsubscribeDto } from './notification.dto';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly pushService: PushService,
  ) {}

  @Get('vapid-public-key')
  @ApiOperation({ summary: 'Public VAPID key for Web Push subscribe' })
  async getVapidPublicKey(@Res() response: Response) {
    return response.status(HttpStatus.OK).json({
      publicKey: this.pushService.getPublicKey(),
      enabled: this.pushService.isEnabled(),
    });
  }

  @Get()
  @UseGuards(SessionGuard, JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'List notifications for current user' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'unreadOnly', required: false })
  async list(
    @Req() request: Request,
    @Res() response: Response,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const userId = request.user?.id;
    if (!userId) {
      return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'User not authenticated' });
    }

    const result = await this.notificationService.listForUser(userId, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      unreadOnly: unreadOnly === 'true' || unreadOnly === '1',
    });

    return response.status(HttpStatus.OK).json(result);
  }

  @Get('unread-count')
  @UseGuards(SessionGuard, JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Unread notification count for current user' })
  async unreadCount(@Req() request: Request, @Res() response: Response) {
    const userId = request.user?.id;
    if (!userId) {
      return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'User not authenticated' });
    }
    const count = await this.notificationService.getUnreadCount(userId);
    return response.status(HttpStatus.OK).json({ count });
  }

  @Post('read-all')
  @UseGuards(SessionGuard, JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@Req() request: Request, @Res() response: Response) {
    const userId = request.user?.id;
    if (!userId) {
      return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'User not authenticated' });
    }
    const result = await this.notificationService.markAllAsRead(userId);
    return response.status(HttpStatus.OK).json(result);
  }

  @Post('push/subscribe')
  @UseGuards(SessionGuard, JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Save Web Push subscription for current user' })
  async subscribePush(
    @Body() body: PushSubscribeDto,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const userId = request.user?.id;
    if (!userId) {
      return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'User not authenticated' });
    }
    const saved = await this.pushService.saveSubscription(userId, body.subscription);
    return response.status(HttpStatus.OK).json({ message: 'Subscribed', data: { id: saved.id } });
  }

  @Post('push/unsubscribe')
  @UseGuards(SessionGuard, JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Remove Web Push subscription for current user' })
  async unsubscribePush(
    @Body() body: PushUnsubscribeDto,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const userId = request.user?.id;
    if (!userId) {
      return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'User not authenticated' });
    }
    await this.pushService.removeSubscription(userId, body.endpoint);
    return response.status(HttpStatus.OK).json({ message: 'Unsubscribed' });
  }

  @Post(':id/read')
  @UseGuards(SessionGuard, JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Mark one notification as read' })
  async markRead(
    @Param('id') id: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const userId = request.user?.id;
    if (!userId) {
      return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'User not authenticated' });
    }
    const notification = await this.notificationService.markAsRead(userId, id);
    return response.status(HttpStatus.OK).json({ data: notification });
  }
}
