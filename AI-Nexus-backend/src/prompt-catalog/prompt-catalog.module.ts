import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PromptCatalogController } from './prompt-catalog.controller';
import { PromptCatalogService } from './prompt-catalog.service';
import { PromptCatalogInitService } from './prompt-catalog-init.service';
import { PromptCatalogItemEntity } from './prompt-catalog.entity';
import { PromptProviderProfileEntity } from './prompt-provider-profile.entity';
import { UserEntity } from '../user/users.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PromptCatalogItemEntity, PromptProviderProfileEntity, UserEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {},
    }),
  ],
  providers: [PromptCatalogService, PromptCatalogInitService],
  controllers: [PromptCatalogController],
  exports: [PromptCatalogService],
})
export class PromptCatalogModule {}
