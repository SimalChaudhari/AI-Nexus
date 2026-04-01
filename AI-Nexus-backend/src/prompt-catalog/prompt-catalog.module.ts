import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PromptCatalogItemEntity } from './prompt-catalog.entity';
import { PromptProviderProfileEntity } from './prompt-provider-profile.entity';
import { PromptCatalogController } from './prompt-catalog.controller';
import { PromptCatalogService } from './prompt-catalog.service';
import { PromptCatalogInitService } from './prompt-catalog-init.service';
import { UserEntity } from '../user/users.entity';
import { LocalStorageService } from '../service/local-storage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PromptCatalogItemEntity, PromptProviderProfileEntity, UserEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {},
    }),
  ],
  providers: [PromptCatalogService, PromptCatalogInitService, LocalStorageService],
  controllers: [PromptCatalogController],
  exports: [PromptCatalogService],
})
export class PromptCatalogModule {}
