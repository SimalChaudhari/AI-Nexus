import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { SpeakerEntity } from './speaker.entity';
import { UserEntity } from '../user/users.entity';
import { SpeakerService } from './speaker.service';
import { SpeakerController } from './speaker.controller';
import { SpeakerInitService } from './speaker-init.service';
import { LocalStorageService } from '../service/local-storage.service';
import { PaginationService } from '../common/pagination/pagination.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SpeakerEntity, UserEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {},
    }),
  ],
  providers: [SpeakerService, SpeakerInitService, LocalStorageService, PaginationService],
  controllers: [SpeakerController],
  exports: [SpeakerService],
})
export class SpeakerModule {}
