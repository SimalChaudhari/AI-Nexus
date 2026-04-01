export class CreateCheckoutItemDto {
  id!: string;
  name!: string;
  price!: number; // in main currency unit (e.g. USD dollars)
  quantity?: number;
}

export class CreateCheckoutDto {
  items!: CreateCheckoutItemDto[];
  successUrl!: string;
  cancelUrl!: string;
  currency?: string; // e.g. 'USD', 'GBP'
}
