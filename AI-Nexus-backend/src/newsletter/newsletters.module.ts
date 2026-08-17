import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { NewsletterService } from './newsletters.service';
import { NewsletterController } from './newsletters.controller';
import { NewslettersInitService } from './newsletters-init.service';
import { NewsletterEntity } from './newsletters.entity';
import { UserEntity } from '../user/users.entity';
import { PaginationService } from '../common/pagination/pagination.service';
import { LocalStorageService } from '../service/local-storage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([NewsletterEntity, UserEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {},
    }),
  ],
  providers: [NewsletterService, NewslettersInitService, PaginationService, LocalStorageService],
  controllers: [NewsletterController],
  exports: [NewsletterService],
})
export class NewsletterModule {}
