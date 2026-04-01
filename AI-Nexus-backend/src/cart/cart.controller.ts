import { Controller, Get, Put, Post, Delete, Patch, Body, Param, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { CartService } from './cart.service';
import type { CartItem } from './cart.entity';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Cart')
@ApiBearerAuth('bearer')
@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /** Get current user's cart (includes optional discount). */
  @Get()
  @ApiOperation({ summary: 'Get current authenticated user cart' })
  async getCart(@Req() req: Request) {
    const userId = (req as any).user?.id;
    if (!userId) return { items: [], discount: 0 };
    return this.cartService.getCart(userId);
  }

  /** Replace entire cart. Optional: discount (number). */
  @Put()
  @ApiOperation({ summary: 'Replace entire cart content' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { type: 'object' } },
        discount: { type: 'number', nullable: true },
      },
    },
  })
  async setCart(
    @Req() req: Request,
    @Body() body: { items?: CartItem[]; discount?: number | null },
  ) {
    const userId = (req as any).user?.id;
    if (!userId) return { items: [], discount: 0 };
    return this.cartService.setCart(userId, body.items ?? [], body.discount);
  }

  /** Add one item to cart (or increase quantity if same id) */
  @Post('items')
  @ApiOperation({ summary: 'Add one item to cart' })
  @ApiBody({ schema: { type: 'object' } })
  async addItem(@Req() req: Request, @Body() body: CartItem) {
    const userId = (req as any).user?.id;
    if (!userId) return { items: [] };
    return this.cartService.addItem(userId, body);
  }

  /** Remove item from cart by id (course id) */
  @Delete('items/:id')
  @ApiOperation({ summary: 'Remove a cart item by item id' })
  async removeItem(@Req() req: Request, @Param('id') itemId: string) {
    const userId = (req as any).user?.id;
    if (!userId) return { items: [] };
    return this.cartService.removeItem(userId, itemId);
  }

  /** Update item quantity by id */
  @Patch('items/:id')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        quantity: { type: 'number', example: 2 },
      },
    },
  })
  async updateItemQuantity(
    @Req() req: Request,
    @Param('id') itemId: string,
    @Body() body: { quantity?: number },
  ) {
    const userId = (req as any).user?.id;
    if (!userId) return { items: [] };
    return this.cartService.updateItemQuantity(userId, itemId, body.quantity ?? 1);
  }
}
