import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { SkillService } from './skills.service';
import { SkillController } from './skills.controller';
import { SkillsInitService } from './skills-init.service';
import { SkillEntity } from './skills.entity';
import { UserEntity } from '../user/users.entity';
import { PaginationService } from '../common/pagination/pagination.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SkillEntity, UserEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {},
    }),
  ],
  providers: [SkillService, SkillsInitService, PaginationService],
  controllers: [SkillController],
  exports: [SkillService],
})
export class SkillModule {}
