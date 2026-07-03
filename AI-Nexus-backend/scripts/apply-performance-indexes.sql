-- AI Nexus — performance indexes for 2000+ concurrent users
-- Safe to re-run (IF NOT EXISTS). Run on production PostgreSQL as a DBA or:
--   psql "$DATABASE_URL" -f scripts/apply-performance-indexes.sql
--
-- Indexes are also applied automatically on API boot via DatabaseIndexInitService
-- unless DATABASE_SKIP_INDEX_INIT=true

BEGIN;

-- users (auth, admin)
CREATE INDEX IF NOT EXISTS "IDX_users_username_lower" ON "users" (LOWER("username"));
CREATE INDEX IF NOT EXISTS "IDX_users_resetToken_active" ON "users" ("resetToken") WHERE "resetToken" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "IDX_users_verificationToken_active" ON "users" ("verificationToken") WHERE "verificationToken" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "IDX_users_signupAccessTokenHash_active" ON "users" ("signupAccessTokenHash") WHERE "signupAccessTokenHash" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "IDX_users_role_status_createdAt" ON "users" ("role", "status", "createdAt" DESC);

-- refresh_tokens
CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_tokenHash_active" ON "refresh_tokens" ("tokenHash") WHERE "revokedAt" IS NULL;
CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_userId_active" ON "refresh_tokens" ("userId") WHERE "revokedAt" IS NULL;

-- courses (catalog)
CREATE INDEX IF NOT EXISTS "IDX_courses_categoryId" ON "courses" ("categoryId");
CREATE INDEX IF NOT EXISTS "IDX_courses_isBundle_createdAt" ON "courses" ("isBundle", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "IDX_courses_category_bundle_createdAt" ON "courses" ("categoryId", "isBundle", "createdAt" DESC);

-- course structure
CREATE INDEX IF NOT EXISTS "IDX_course_modules_courseId" ON "course_modules" ("courseId");
CREATE INDEX IF NOT EXISTS "IDX_course_modules_courseId_sortOrder" ON "course_modules" ("courseId", "sortOrder");
CREATE INDEX IF NOT EXISTS "IDX_course_module_sections_moduleId" ON "course_module_sections" ("moduleId");
CREATE INDEX IF NOT EXISTS "IDX_course_module_sections_moduleId_sortOrder" ON "course_module_sections" ("moduleId", "sortOrder");

-- enrollments
CREATE INDEX IF NOT EXISTS "IDX_course_enrollments_userId" ON "course_enrollments" ("userId");
CREATE INDEX IF NOT EXISTS "IDX_course_enrollments_courseId" ON "course_enrollments" ("courseId");
CREATE INDEX IF NOT EXISTS "IDX_course_enrollments_user_course" ON "course_enrollments" ("userId", "courseId");

-- video progress
CREATE INDEX IF NOT EXISTS "IDX_course_section_watch_progress_userId" ON "course_section_watch_progress" ("userId");
CREATE INDEX IF NOT EXISTS "IDX_course_section_watch_progress_user_course" ON "course_section_watch_progress" ("userId", "courseId");

-- assessments
CREATE INDEX IF NOT EXISTS "IDX_course_question_bank_courseId" ON "course_question_bank" ("courseId");
CREATE INDEX IF NOT EXISTS "IDX_course_question_bank_course_module" ON "course_question_bank" ("courseId", "moduleId");
CREATE INDEX IF NOT EXISTS "IDX_course_question_bank_attempt_user_course" ON "course_question_bank_attempt" ("userId", "courseId");
CREATE INDEX IF NOT EXISTS "IDX_course_question_assignment_submissions_courseId" ON "course_question_assignment_submissions" ("courseId");
CREATE INDEX IF NOT EXISTS "IDX_course_question_assignment_submissions_course_status" ON "course_question_assignment_submissions" ("courseId", "evaluationStatus");
CREATE INDEX IF NOT EXISTS "IDX_course_question_assignment_submissions_userId" ON "course_question_assignment_submissions" ("userId");

-- orders / payments
CREATE INDEX IF NOT EXISTS "IDX_orders_clientReferenceId" ON "orders" ("clientReferenceId");
CREATE INDEX IF NOT EXISTS "IDX_orders_userId_status_createdAt" ON "orders" ("userId", "status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "IDX_payment_references_userId" ON "payment_references" ("userId");

-- favorites / certificates
CREATE INDEX IF NOT EXISTS "IDX_course_favorites_userId" ON "course_favorites" ("userId");
CREATE INDEX IF NOT EXISTS "IDX_course_favorites_courseId" ON "course_favorites" ("courseId");
CREATE INDEX IF NOT EXISTS "IDX_course_certificates_user_status" ON "course_certificates" ("userId", "status");

-- forum / announcements
CREATE INDEX IF NOT EXISTS "IDX_comments_announcementId" ON "comments" ("announcementId");
CREATE INDEX IF NOT EXISTS "IDX_comments_parentCommentId" ON "comments" ("parentCommentId");
CREATE INDEX IF NOT EXISTS "IDX_comment_likes_commentId" ON "comment_likes" ("commentId");
CREATE INDEX IF NOT EXISTS "IDX_post_comments_postId" ON "post_comments" ("postId");
CREATE INDEX IF NOT EXISTS "IDX_post_comments_parentCommentId" ON "post_comments" ("parentCommentId");
CREATE INDEX IF NOT EXISTS "IDX_post_comment_likes_commentId" ON "post_comment_likes" ("commentId");
CREATE INDEX IF NOT EXISTS "IDX_posts_createdAt" ON "posts" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "IDX_announcements_createdAt" ON "announcements" ("createdAt" DESC);

-- workflows
CREATE INDEX IF NOT EXISTS "IDX_workflows_createdAt" ON "workflows" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "IDX_workflows_labelId" ON "workflows" ("labelId");
CREATE INDEX IF NOT EXISTS "IDX_workflow_tags_tagId" ON "workflow_tags" ("tagId");

COMMIT;

-- Verify (optional):
-- SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'IDX_%' ORDER BY tablename, indexname;
