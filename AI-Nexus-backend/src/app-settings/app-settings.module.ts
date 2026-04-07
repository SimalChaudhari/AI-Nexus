import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { UserEntity } from '../user/users.entity';
import { LocalStorageModule } from '../service/local-storage.module';
import { AppSettingsEntity } from './app-settings.entity';
import { AppSettingsController } from './app-settings.controller';
import { AppSettingsService } from './app-settings.service';
import { AppSettingsInitService } from './app-settings-init.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AppSettingsEntity, UserEntity]),
    LocalStorageModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {},
    }),
  ],
  providers: [AppSettingsService, AppSettingsInitService],
  controllers: [AppSettingsController],
  exports: [AppSettingsService],
})
export class AppSettingsModule {}
