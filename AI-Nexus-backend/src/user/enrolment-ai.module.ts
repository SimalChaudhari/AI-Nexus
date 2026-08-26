import { Module } from '@nestjs/common';

import { EnrolmentAiService } from './enrolment-ai.service';

@Module({
  providers: [EnrolmentAiService],
  exports: [EnrolmentAiService],
})
export class EnrolmentAiModule {}
