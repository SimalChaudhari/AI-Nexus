import { Injectable, Logger } from '@nestjs/common';

import { CourseAssignmentGradingService } from './course-assignment-grading.service';
import { CourseQuizAssessmentProgressService } from './course-quiz-assessment-progress.service';
import { CourseQuestionAssignmentSubmissionEntity } from './course-question-assignment-submission.entity';
import { resolveSubmissionPassed } from './course-assignment-submission-evaluation.types';
import { isStructuredEvaluationEnabled } from '../assessment-evaluation/assessment-evaluation.types';
import { StructuredAssessmentGradingService } from '../assessment-evaluation/services/structured-assessment-grading.service';
import { BlueprintIngestionService } from '../assessment-evaluation/services/blueprint-ingestion.service';

@Injectable()
export class AssignmentGradingRouterService {
  private readonly logger = new Logger(AssignmentGradingRouterService.name);

  constructor(
    private readonly legacyGradingService: CourseAssignmentGradingService,
    private readonly structuredGradingService: StructuredAssessmentGradingService,
    private readonly blueprintIngestionService: BlueprintIngestionService,
    private readonly quizAssessmentProgressService: CourseQuizAssessmentProgressService,
  ) {}

  queueBlueprintIngestion(questionBankId: string, forceReprocess = false): void {
    if (!isStructuredEvaluationEnabled()) return;
    this.blueprintIngestionService.queueIngestion(questionBankId, forceReprocess);
  }

  queueGrading(submissionId: string): void {
    if (isStructuredEvaluationEnabled()) {
      void this.gradeStructured(submissionId);
      return;
    }
    this.legacyGradingService.queueGrading(submissionId);
  }

  private async gradeStructured(submissionId: string): Promise<void> {
    try {
      const saved = await this.structuredGradingService.gradeSubmissionById(submissionId);
      if (!saved) return;

      const { passed } = resolveSubmissionPassed(saved);
      this.quizAssessmentProgressService.markSubmissionCompleted(saved, passed);
      void this.quizAssessmentProgressService.notifyLearnerProgressUpdate(
        saved.userId,
        saved.courseId,
      );
    } catch (error) {
      this.logger.error(
        `Structured grading router failed for ${submissionId}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  async gradeSubmissionById(
    submissionId: string,
  ): Promise<CourseQuestionAssignmentSubmissionEntity | null> {
    if (!isStructuredEvaluationEnabled()) {
      return this.legacyGradingService.gradeSubmissionById(submissionId);
    }
    const saved = await this.structuredGradingService.gradeSubmissionById(submissionId);
    if (!saved) return null;
    const { passed } = resolveSubmissionPassed(saved);
    this.quizAssessmentProgressService.markSubmissionCompleted(saved, passed);
    void this.quizAssessmentProgressService.notifyLearnerProgressUpdate(
      saved.userId,
      saved.courseId,
    );
    return saved;
  }
}
