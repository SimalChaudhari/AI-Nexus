/**
 * Idempotent PostgreSQL indexes for high-traffic paths (catalog, learning, auth, payments).
 * Applied on API boot via DatabaseIndexInitService and manually via scripts/apply-performance-indexes.sql
 */
export type PerformanceIndexDef = {
  name: string;
  table: string;
  sql: string;
};

export const DATABASE_PERFORMANCE_INDEXES: PerformanceIndexDef[] = [
  // --- users (auth, admin lists) ---
  {
    name: 'IDX_users_username_lower',
    table: 'users',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_users_username_lower" ON "users" (LOWER("username"))`,
  },
  {
    name: 'IDX_users_resetToken_active',
    table: 'users',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_users_resetToken_active" ON "users" ("resetToken") WHERE "resetToken" IS NOT NULL`,
  },
  {
    name: 'IDX_users_verificationToken_active',
    table: 'users',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_users_verificationToken_active" ON "users" ("verificationToken") WHERE "verificationToken" IS NOT NULL`,
  },
  {
    name: 'IDX_users_signupAccessTokenHash_active',
    table: 'users',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_users_signupAccessTokenHash_active" ON "users" ("signupAccessTokenHash") WHERE "signupAccessTokenHash" IS NOT NULL`,
  },
  {
    name: 'IDX_users_role_status_createdAt',
    table: 'users',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_users_role_status_createdAt" ON "users" ("role", "status", "createdAt" DESC)`,
  },

  // --- refresh_tokens (session refresh / logout-all) ---
  {
    name: 'IDX_refresh_tokens_tokenHash_active',
    table: 'refresh_tokens',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_tokenHash_active" ON "refresh_tokens" ("tokenHash") WHERE "revokedAt" IS NULL`,
  },
  {
    name: 'IDX_refresh_tokens_userId_active',
    table: 'refresh_tokens',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_userId_active" ON "refresh_tokens" ("userId") WHERE "revokedAt" IS NULL`,
  },

  // --- courses (catalog filters + sort) ---
  {
    name: 'IDX_courses_categoryId',
    table: 'courses',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_courses_categoryId" ON "courses" ("categoryId")`,
  },
  {
    name: 'IDX_courses_isBundle_createdAt',
    table: 'courses',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_courses_isBundle_createdAt" ON "courses" ("isBundle", "createdAt" DESC)`,
  },
  {
    name: 'IDX_courses_category_bundle_createdAt',
    table: 'courses',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_courses_category_bundle_createdAt" ON "courses" ("categoryId", "isBundle", "createdAt" DESC)`,
  },

  // --- course structure (player + admin) ---
  {
    name: 'IDX_course_modules_courseId',
    table: 'course_modules',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_course_modules_courseId" ON "course_modules" ("courseId")`,
  },
  {
    name: 'IDX_course_modules_courseId_sortOrder',
    table: 'course_modules',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_course_modules_courseId_sortOrder" ON "course_modules" ("courseId", "sortOrder")`,
  },
  {
    name: 'IDX_course_module_sections_moduleId',
    table: 'course_module_sections',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_course_module_sections_moduleId" ON "course_module_sections" ("moduleId")`,
  },
  {
    name: 'IDX_course_module_sections_moduleId_sortOrder',
    table: 'course_module_sections',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_course_module_sections_moduleId_sortOrder" ON "course_module_sections" ("moduleId", "sortOrder")`,
  },

  // --- enrollments (already partially indexed; ensure composite) ---
  {
    name: 'IDX_course_enrollments_userId',
    table: 'course_enrollments',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_course_enrollments_userId" ON "course_enrollments" ("userId")`,
  },
  {
    name: 'IDX_course_enrollments_courseId',
    table: 'course_enrollments',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_course_enrollments_courseId" ON "course_enrollments" ("courseId")`,
  },
  {
    name: 'IDX_course_enrollments_user_course',
    table: 'course_enrollments',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_course_enrollments_user_course" ON "course_enrollments" ("userId", "courseId")`,
  },

  // --- video / section progress (learning player hot path) ---
  {
    name: 'IDX_course_section_watch_progress_userId',
    table: 'course_section_watch_progress',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_course_section_watch_progress_userId" ON "course_section_watch_progress" ("userId")`,
  },
  {
    name: 'IDX_course_section_watch_progress_user_course',
    table: 'course_section_watch_progress',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_course_section_watch_progress_user_course" ON "course_section_watch_progress" ("userId", "courseId")`,
  },

  // --- question bank & assessments ---
  {
    name: 'IDX_course_question_bank_courseId',
    table: 'course_question_bank',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_course_question_bank_courseId" ON "course_question_bank" ("courseId")`,
  },
  {
    name: 'IDX_course_question_bank_course_module',
    table: 'course_question_bank',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_course_question_bank_course_module" ON "course_question_bank" ("courseId", "moduleId")`,
  },
  {
    name: 'IDX_course_question_bank_attempt_user_course',
    table: 'course_question_bank_attempt',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_course_question_bank_attempt_user_course" ON "course_question_bank_attempt" ("userId", "courseId")`,
  },
  {
    name: 'IDX_course_question_assignment_submissions_courseId',
    table: 'course_question_assignment_submissions',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_course_question_assignment_submissions_courseId" ON "course_question_assignment_submissions" ("courseId")`,
  },
  {
    name: 'IDX_course_question_assignment_submissions_course_status',
    table: 'course_question_assignment_submissions',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_course_question_assignment_submissions_course_status" ON "course_question_assignment_submissions" ("courseId", "evaluationStatus")`,
  },
  {
    name: 'IDX_course_question_assignment_submissions_userId',
    table: 'course_question_assignment_submissions',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_course_question_assignment_submissions_userId" ON "course_question_assignment_submissions" ("userId")`,
  },

  // --- orders / payments (webhooks, receipts) ---
  {
    name: 'IDX_orders_clientReferenceId',
    table: 'orders',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_orders_clientReferenceId" ON "orders" ("clientReferenceId")`,
  },
  {
    name: 'IDX_orders_userId_status_createdAt',
    table: 'orders',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_orders_userId_status_createdAt" ON "orders" ("userId", "status", "createdAt" DESC)`,
  },
  {
    name: 'IDX_payment_references_userId',
    table: 'payment_references',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_payment_references_userId" ON "payment_references" ("userId")`,
  },

  // --- favorites & certificates ---
  {
    name: 'IDX_course_favorites_userId',
    table: 'course_favorites',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_course_favorites_userId" ON "course_favorites" ("userId")`,
  },
  {
    name: 'IDX_course_favorites_courseId',
    table: 'course_favorites',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_course_favorites_courseId" ON "course_favorites" ("courseId")`,
  },
  {
    name: 'IDX_course_certificates_user_status',
    table: 'course_certificates',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_course_certificates_user_status" ON "course_certificates" ("userId", "status")`,
  },

  // --- forum & announcements ---
  {
    name: 'IDX_comments_announcementId',
    table: 'comments',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_comments_announcementId" ON "comments" ("announcementId")`,
  },
  {
    name: 'IDX_comments_parentCommentId',
    table: 'comments',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_comments_parentCommentId" ON "comments" ("parentCommentId")`,
  },
  {
    name: 'IDX_comment_likes_commentId',
    table: 'comment_likes',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_comment_likes_commentId" ON "comment_likes" ("commentId")`,
  },
  {
    name: 'IDX_post_comments_postId',
    table: 'post_comments',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_post_comments_postId" ON "post_comments" ("postId")`,
  },
  {
    name: 'IDX_post_comments_parentCommentId',
    table: 'post_comments',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_post_comments_parentCommentId" ON "post_comments" ("parentCommentId")`,
  },
  {
    name: 'IDX_post_comment_likes_commentId',
    table: 'post_comment_likes',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_post_comment_likes_commentId" ON "post_comment_likes" ("commentId")`,
  },
  {
    name: 'IDX_posts_createdAt',
    table: 'posts',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_posts_createdAt" ON "posts" ("createdAt" DESC)`,
  },
  {
    name: 'IDX_announcements_createdAt',
    table: 'announcements',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_announcements_createdAt" ON "announcements" ("createdAt" DESC)`,
  },

  // --- workflows ---
  {
    name: 'IDX_workflows_createdAt',
    table: 'workflows',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_workflows_createdAt" ON "workflows" ("createdAt" DESC)`,
  },
  {
    name: 'IDX_workflows_labelId',
    table: 'workflows',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_workflows_labelId" ON "workflows" ("labelId")`,
  },
  {
    name: 'IDX_workflow_tags_tagId',
    table: 'workflow_tags',
    sql: `CREATE INDEX IF NOT EXISTS "IDX_workflow_tags_tagId" ON "workflow_tags" ("tagId")`,
  },
];
