import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class PushSubscribeDto {
  @IsObject()
  @IsNotEmpty()
  subscription!: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
}

export class PushUnsubscribeDto {
  @IsString()
  @IsNotEmpty()
  endpoint!: string;
}
