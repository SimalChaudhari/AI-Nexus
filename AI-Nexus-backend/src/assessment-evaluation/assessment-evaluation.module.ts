import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CourseQuestionBankEntity } from '../course/course-question-bank.entity';
import { CourseQuestionAssignmentSubmissionEntity } from '../course/course-question-assignment-submission.entity';
import { LocalStorageService } from '../service/local-storage.service';
import { AssessmentEvaluationInitService } from './assessment-evaluation-init.service';
import { AssessmentBlueprintEntity } from './entities/assessment-blueprint.entity';
import { AssessmentGuidelineRulesEntity } from './entities/assessment-guideline-rules.entity';
import { AssessmentQuestionEntity } from './entities/assessment-question.entity';
import { AssessmentSubmissionAnswerEntity } from './entities/assessment-submission-answer.entity';
import { AssessmentQuestionEvaluationEntity } from './entities/assessment-question-evaluation.entity';
import { DocumentTextExtractionService } from './services/document-text-extraction.service';
import {
  GuidelineRulesService,
  QuestionSplitterService,
} from './services/guideline-and-splitter.service';
import {
  EvaluationAggregatorService,
  PerQuestionEvaluatorService,
} from './services/evaluation-engine.service';
import { BlueprintIngestionService } from './services/blueprint-ingestion.service';
import { StructuredAssessmentGradingService } from './services/structured-assessment-grading.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AssessmentBlueprintEntity,
      AssessmentGuidelineRulesEntity,
      AssessmentQuestionEntity,
      AssessmentSubmissionAnswerEntity,
      AssessmentQuestionEvaluationEntity,
      CourseQuestionBankEntity,
      CourseQuestionAssignmentSubmissionEntity,
    ]),
  ],
  providers: [
    AssessmentEvaluationInitService,
    DocumentTextExtractionService,
    GuidelineRulesService,
    QuestionSplitterService,
    PerQuestionEvaluatorService,
    EvaluationAggregatorService,
    BlueprintIngestionService,
    StructuredAssessmentGradingService,
    LocalStorageService,
  ],
  exports: [
    BlueprintIngestionService,
    StructuredAssessmentGradingService,
    DocumentTextExtractionService,
  ],
})
export class AssessmentEvaluationModule {}
