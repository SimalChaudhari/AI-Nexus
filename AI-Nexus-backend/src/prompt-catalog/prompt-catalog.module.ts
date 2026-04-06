import { Module } from '@nestjs/common';
import { PromptCatalogController } from './prompt-catalog.controller';
import { PromptCatalogService } from './prompt-catalog.service';

@Module({
  providers: [PromptCatalogService],
  controllers: [PromptCatalogController],
  exports: [PromptCatalogService],
})
export class PromptCatalogModule {}
