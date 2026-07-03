import { Global, Module } from '@nestjs/common';

import { DatabaseIndexInitService } from './database-index-init.service';

@Global()
@Module({
  providers: [DatabaseIndexInitService],
  exports: [DatabaseIndexInitService],
})
export class DatabaseIndexModule {}
