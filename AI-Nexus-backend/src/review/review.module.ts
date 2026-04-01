import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ReviewEntity } from './review.entity';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { ReviewInitService } from './review-init.service';
import { UserEntity } from '../user/users.entity';
import { CourseEntity } from '../course/courses.entity';
import { SpeakerEntity } from '../speaker/speaker.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReviewEntity, UserEntity, CourseEntity, SpeakerEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {},
    }),
  ],
  providers: [ReviewService, ReviewInitService],
  controllers: [ReviewController],
  exports: [ReviewService],
})
export class ReviewModule {}
