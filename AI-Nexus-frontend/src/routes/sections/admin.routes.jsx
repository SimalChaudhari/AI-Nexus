import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { CONFIG } from 'src/config-global';
import { DashboardLayout } from 'src/layouts/dashboard';


import { LoadingScreen } from 'src/components/loading-screen';

import { AuthGuard, RoleBasedGuard } from 'src/auth/guard';
import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

// Overview
const IndexPage = lazy(() => import('src/pages/dashboard'));
const OverviewEcommercePage = lazy(() => import('src/pages/dashboard/ecommerce'));
const OverviewAnalyticsPage = lazy(() => import('src/pages/dashboard/analytics'));
const OverviewBankingPage = lazy(() => import('src/pages/dashboard/banking'));
const OverviewBookingPage = lazy(() => import('src/pages/dashboard/booking'));
const OverviewFilePage = lazy(() => import('src/pages/dashboard/file'));
// OverviewCoursePage demo removed — it used path `course` and conflicted with Course management routes.

// Product
const ProductDetailsPage = lazy(() => import('src/pages/dashboard/product/details'));
const ProductListPage = lazy(() => import('src/pages/dashboard/product/list'));
const ProductCreatePage = lazy(() => import('src/pages/dashboard/product/new'));
const ProductEditPage = lazy(() => import('src/pages/dashboard/product/edit'));

// Order
const OrderListPage = lazy(() => import('src/pages/dashboard/order/list'));
const OrderDetailsPage = lazy(() => import('src/pages/dashboard/order/details'));

// Corporate members
const CorporateMemberListPage = lazy(() => import('src/pages/dashboard/corporate-member/list'));
const CorporateMemberDetailsPage = lazy(() => import('src/pages/dashboard/corporate-member/details'));

// Payment (membership pricing + voucher codes + company QR + history)
const AdminPaymentPage = lazy(() => import('src/pages/dashboard/payment'));
const AdminPaymentHistoryPage = lazy(() => import('src/pages/dashboard/payment/history'));
const AdminPaymentHistoryDetailsPage = lazy(() => import('src/pages/dashboard/payment/history-details'));
const AdminCompanyEnrollmentPage = lazy(() => import('src/pages/dashboard/payment/company-enrollment'));

// Invoice
const InvoiceListPage = lazy(() => import('src/pages/dashboard/invoice/list'));
const InvoiceDetailsPage = lazy(() => import('src/pages/dashboard/invoice/details'));
const InvoiceCreatePage = lazy(() => import('src/pages/dashboard/invoice/new'));
const InvoiceEditPage = lazy(() => import('src/pages/dashboard/invoice/edit'));

// User Management (Admin only)
const UserListPage = lazy(() => import('src/pages/dashboard/user/list'));
const UserCreatePage = lazy(() => import('src/pages/dashboard/user/new'));
const UserEditPage = lazy(() => import('src/pages/dashboard/user/edit'));
const UserDetailsPage = lazy(() => import('src/pages/dashboard/user/details'));
const UserProfileDetailPage = lazy(() => import('src/pages/dashboard/user/profile-detail'));
const UserProfileOwnPage = lazy(() => import('src/pages/dashboard/user/profile-own'));

// Admin Profile
const AdminProfilePage = lazy(() => import('src/pages/dashboard/admin/profile'));

// Category Management (Admin only)
const CategoryListPage = lazy(() => import('src/pages/dashboard/category/list'));
const CategoryCreatePage = lazy(() => import('src/pages/dashboard/category/new'));
const CategoryEditPage = lazy(() => import('src/pages/dashboard/category/edit'));
const CategoryDetailsPage = lazy(() => import('src/pages/dashboard/category/details'));

const ProgramListPage = lazy(() => import('src/pages/dashboard/course/program/list'));
const ProgramCreatePage = lazy(() => import('src/pages/dashboard/course/program/new'));
const ProgramEditPage = lazy(() => import('src/pages/dashboard/course/program/edit'));
const ProgramDetailsPage = lazy(() => import('src/pages/dashboard/course/program/details'));

// Announcement Management (Admin only)
const AnnouncementListPage = lazy(() => import('src/pages/dashboard/announcement/list'));
const AnnouncementCreatePage = lazy(() => import('src/pages/dashboard/announcement/new'));
const AnnouncementEditPage = lazy(() => import('src/pages/dashboard/announcement/edit'));

// AI Forum Management (Admin only)
const AiForumListPage = lazy(() => import('../../pages/dashboard/ai-forum/list'));
const AiForumCreatePage = lazy(() => import('../../pages/dashboard/ai-forum/new'));
const AiForumEditPage = lazy(() => import('../../pages/dashboard/ai-forum/edit'));
const AiForumDetailsPage = lazy(() => import('../../pages/dashboard/ai-forum/details'));

// Course Management (Admin only)
const CourseListPage = lazy(() => import('src/pages/dashboard/course/list'));
const CourseCreatePage = lazy(() => import('src/pages/dashboard/course/new'));
const CourseEditPage = lazy(() => import('src/pages/dashboard/course/edit'));
const CourseDetailsPage = lazy(() => import('src/pages/dashboard/course/details'));
const CourseAttemptsPage = lazy(() => import('src/pages/dashboard/course/attempts'));
const CourseCertificatesPage = lazy(() => import('src/pages/dashboard/course/certificates'));
const CourseAssessmentsPage = lazy(() => import('src/pages/dashboard/course/assessments'));

// Label Management (Admin only)
const LabelListPage = lazy(() => import('src/pages/dashboard/label/list'));
const LabelCreatePage = lazy(() => import('src/pages/dashboard/label/new'));
const LabelEditPage = lazy(() => import('src/pages/dashboard/label/edit'));
const LabelDetailsPage = lazy(() => import('src/pages/dashboard/label/details'));

// Tag Management (Admin only)
const TagListPage = lazy(() => import('src/pages/dashboard/tag/list'));
const TagCreatePage = lazy(() => import('src/pages/dashboard/tag/new'));
const TagEditPage = lazy(() => import('src/pages/dashboard/tag/edit'));
const TagDetailsPage = lazy(() => import('src/pages/dashboard/tag/details'));

// Workflow Management (Admin only)
const WorkflowListPage = lazy(() => import('src/pages/dashboard/workflow/list'));
const WorkflowCreatePage = lazy(() => import('src/pages/dashboard/workflow/new'));
const WorkflowEditPage = lazy(() => import('src/pages/dashboard/workflow/edit'));
const WorkflowDetailsPage = lazy(() => import('src/pages/dashboard/workflow/details'));
const PromptListPage = lazy(() => import('src/pages/dashboard/prompt/list'));
const PromptCreatePage = lazy(() => import('src/pages/dashboard/prompt/new'));
const PromptCategoryItemsPage = lazy(() => import('src/pages/dashboard/prompt/items'));
const PromptDetailsPage = lazy(() => import('src/pages/dashboard/prompt/details'));
const PromptEditPage = lazy(() => import('src/pages/dashboard/prompt/edit'));

// Speaker Management (Admin only)
const SpeakerListPage = lazy(() => import('../../pages/dashboard/speaker/list'));
const SpeakerCreatePage = lazy(() => import('../../pages/dashboard/speaker/new'));
const SpeakerEditPage = lazy(() => import('../../pages/dashboard/speaker/edit'));
const SpeakerDetailsPage = lazy(() => import('../../pages/dashboard/speaker/details'));

// Language Management (Admin only)
const LanguageListPage = lazy(() => import('src/pages/dashboard/language/list'));
const LanguageCreatePage = lazy(() => import('src/pages/dashboard/language/new'));
const LanguageEditPage = lazy(() => import('src/pages/dashboard/language/edit'));
const LanguageDetailsPage = lazy(() => import('src/pages/dashboard/language/details'));

// Blog
const BlogPostsPage = lazy(() => import('src/pages/dashboard/post/list'));
const BlogPostPage = lazy(() => import('src/pages/dashboard/post/details'));
const BlogNewPostPage = lazy(() => import('src/pages/dashboard/post/new'));
const BlogEditPostPage = lazy(() => import('src/pages/dashboard/post/edit'));

// Job
const JobDetailsPage = lazy(() => import('src/pages/dashboard/job/details'));
const JobListPage = lazy(() => import('src/pages/dashboard/job/list'));
const JobCreatePage = lazy(() => import('src/pages/dashboard/job/new'));
const JobEditPage = lazy(() => import('src/pages/dashboard/job/edit'));

// Tour
const TourDetailsPage = lazy(() => import('src/pages/dashboard/tour/details'));
const TourListPage = lazy(() => import('src/pages/dashboard/tour/list'));
const TourCreatePage = lazy(() => import('src/pages/dashboard/tour/new'));
const TourEditPage = lazy(() => import('src/pages/dashboard/tour/edit'));

// File manager
const FileManagerPage = lazy(() => import('src/pages/dashboard/file-manager'));

// App
const ChatPage = lazy(() => import('src/pages/dashboard/chat'));
const MailPage = lazy(() => import('src/pages/dashboard/mail'));
const CalendarPage = lazy(() => import('src/pages/dashboard/calendar'));
const KanbanPage = lazy(() => import('src/pages/dashboard/kanban'));

// Test render page by role
const PermissionDeniedPage = lazy(() => import('src/pages/dashboard/permission'));

// Blank page
const ParamsPage = lazy(() => import('src/pages/dashboard/params'));
const BlankPage = lazy(() => import('src/pages/dashboard/blank'));

// Settings
const SettingsPage = lazy(() => import('src/pages/dashboard/settings'));

// ----------------------------------------------------------------------

function AdminLayoutContent() {
  const { user } = useAuthContext();
  const currentRole = user?.role || 'User';

  return (
    <DashboardLayout>
      <Suspense fallback={<LoadingScreen />}>
        <RoleBasedGuard
          currentRole={currentRole}
          acceptRoles={['Admin']}
          hasContent
          redirectTo="/home"
        >
          <Outlet />
        </RoleBasedGuard>
      </Suspense>
    </DashboardLayout>
  );
}

function AdminRoutesWrapper() {
  return CONFIG.auth.skip ? (
    <AdminLayoutContent />
  ) : (
    <AuthGuard>
      <AdminLayoutContent />
    </AuthGuard>
  );
}

const layoutContent = <AdminRoutesWrapper />;

// ----------------------------------------------------------------------

export const adminRoutes = [
  {
    path: 'admin',
    element: layoutContent,
    children: [
      { element: <IndexPage />, index: true },
      { path: 'dashboard', element: <IndexPage /> },
      { path: 'ecommerce', element: <OverviewEcommercePage /> },
      { path: 'analytics', element: <OverviewAnalyticsPage /> },
      { path: 'banking', element: <OverviewBankingPage /> },
      { path: 'booking', element: <OverviewBookingPage /> },
      { path: 'file', element: <OverviewFilePage /> },
      // NOTE: Do not add a sibling `{ path: 'course', element: ... }` here — it conflicts with
      // the real Course management routes below (`path: 'course'` + children) and can remount the page.
      {
        path: 'user',
        children: [
          { element: <UserListPage />, index: true },
          { path: 'list', element: <UserListPage /> },
          { path: 'new', element: <UserCreatePage /> },
          { path: 'profile', element: <UserProfileOwnPage /> },
          { path: 'profile/:id', element: <UserProfileDetailPage /> },
          { path: ':id', element: <UserDetailsPage /> },
          { path: ':id/edit', element: <UserEditPage /> },
        ],
      },
      {
        path: 'announcement',
        children: [
          { element: <AnnouncementListPage />, index: true },
          { path: 'list', element: <AnnouncementListPage /> },
          { path: 'new', element: <AnnouncementCreatePage /> },
          { path: ':id/edit', element: <AnnouncementEditPage /> },
        ],
      },
      {
        path: 'ai-forum',
        children: [
          { element: <AiForumListPage />, index: true },
          { path: 'list', element: <AiForumListPage /> },
          { path: 'new', element: <AiForumCreatePage /> },
          { path: ':id', element: <AiForumDetailsPage /> },
          { path: ':id/edit', element: <AiForumEditPage /> },
        ],
      },
      {
        path: 'course',
        children: [
          { element: <CourseListPage />, index: true },
          { path: 'list', element: <CourseListPage /> },
          { path: 'new', element: <CourseCreatePage /> },
          { path: 'attempts', element: <CourseAttemptsPage /> },
          { path: 'certificates', element: <CourseCertificatesPage /> },
          {
            path: 'category',
            children: [
              { element: <CategoryListPage />, index: true },
              { path: 'list', element: <CategoryListPage /> },
              { path: 'new', element: <CategoryCreatePage /> },
              { path: ':id', element: <CategoryDetailsPage /> },
              { path: ':id/edit', element: <CategoryEditPage /> },
            ],
          },
          {
            path: 'program',
            children: [
              { element: <ProgramListPage />, index: true },
              { path: 'list', element: <ProgramListPage /> },
              { path: 'new', element: <ProgramCreatePage /> },
              { path: ':id', element: <ProgramDetailsPage /> },
              { path: ':id/edit', element: <ProgramEditPage /> },
            ],
          },
          { path: ':id/assessments', element: <CourseAssessmentsPage /> },
          { path: ':id', element: <CourseDetailsPage /> },
          { path: ':id/edit', element: <CourseEditPage /> },
        ],
      },
      {
        path: 'label',
        children: [
          { element: <LabelListPage />, index: true },
          { path: 'list', element: <LabelListPage /> },
          { path: 'new', element: <LabelCreatePage /> },
          { path: ':id', element: <LabelDetailsPage /> },
          { path: ':id/edit', element: <LabelEditPage /> },
        ],
      },
      {
        path: 'tag',
        children: [
          { element: <TagListPage />, index: true },
          { path: 'list', element: <TagListPage /> },
          { path: 'new', element: <TagCreatePage /> },
          { path: ':id', element: <TagDetailsPage /> },
          { path: ':id/edit', element: <TagEditPage /> },
        ],
      },
      {
        path: 'ai-resources',
        children: [
          { element: <WorkflowListPage />, index: true },
          { path: 'list', element: <WorkflowListPage /> },
          { path: 'new', element: <WorkflowCreatePage /> },
          { path: ':id', element: <WorkflowDetailsPage /> },
          { path: ':id/edit', element: <WorkflowEditPage /> },
        ],
      },
      {
        path: 'prompt',
        children: [
          { element: <PromptListPage />, index: true },
          { path: 'list', element: <PromptListPage /> },
          { path: 'new', element: <PromptCreatePage /> },
          { path: 'items', element: <PromptCategoryItemsPage /> },
          { path: ':id', element: <PromptDetailsPage /> },
          { path: ':id/edit', element: <PromptEditPage /> },
        ],
      },
      {
        path: 'speaker',
        children: [
          { element: <SpeakerListPage />, index: true },
          { path: 'list', element: <SpeakerListPage /> },
          { path: 'new', element: <SpeakerCreatePage /> },
          { path: ':id', element: <SpeakerDetailsPage /> },
          { path: ':id/edit', element: <SpeakerEditPage /> },
        ],
      },
      {
        path: 'language',
        children: [
          { element: <LanguageListPage />, index: true },
          { path: 'list', element: <LanguageListPage /> },
          { path: 'new', element: <LanguageCreatePage /> },
          { path: ':id', element: <LanguageDetailsPage /> },
          { path: ':id/edit', element: <LanguageEditPage /> },
        ],
      },
      {
        path: 'product',
        children: [
          { element: <ProductListPage />, index: true },
          { path: 'list', element: <ProductListPage /> },
          { path: ':id', element: <ProductDetailsPage /> },
          { path: 'new', element: <ProductCreatePage /> },
          { path: ':id/edit', element: <ProductEditPage /> },
        ],
      },
      {
        path: 'order',
        children: [
          { element: <OrderListPage />, index: true },
          { path: 'list', element: <OrderListPage /> },
          { path: ':id', element: <OrderDetailsPage /> },
        ],
      },
      {
        path: 'corporate-member',
        children: [
          { element: <CorporateMemberListPage />, index: true },
          { path: 'list', element: <CorporateMemberListPage /> },
          { path: ':id', element: <CorporateMemberDetailsPage /> },
        ],
      },
      { path: 'payment', element: <AdminPaymentPage /> },
      { path: 'payment/company-enrollment', element: <AdminCompanyEnrollmentPage /> },
      { path: 'payment/history', element: <AdminPaymentHistoryPage /> },
      { path: 'payment/history/:id', element: <AdminPaymentHistoryDetailsPage /> },
      {
        path: 'invoice',
        children: [
          { element: <InvoiceListPage />, index: true },
          { path: 'list', element: <InvoiceListPage /> },
          { path: ':id', element: <InvoiceDetailsPage /> },
          { path: ':id/edit', element: <InvoiceEditPage /> },
          { path: 'new', element: <InvoiceCreatePage /> },
        ],
      },
      {
        path: 'post',
        children: [
          { element: <BlogPostsPage />, index: true },
          { path: 'list', element: <BlogPostsPage /> },
          { path: ':title', element: <BlogPostPage /> },
          { path: ':title/edit', element: <BlogEditPostPage /> },
          { path: 'new', element: <BlogNewPostPage /> },
        ],
      },
      {
        path: 'job',
        children: [
          { element: <JobListPage />, index: true },
          { path: 'list', element: <JobListPage /> },
          { path: ':id', element: <JobDetailsPage /> },
          { path: 'new', element: <JobCreatePage /> },
          { path: ':id/edit', element: <JobEditPage /> },
        ],
      },
      {
        path: 'tour',
        children: [
          { element: <TourListPage />, index: true },
          { path: 'list', element: <TourListPage /> },
          { path: ':id', element: <TourDetailsPage /> },
          { path: 'new', element: <TourCreatePage /> },
          { path: ':id/edit', element: <TourEditPage /> },
        ],
      },
      { path: 'file-manager', element: <FileManagerPage /> },
      { path: 'mail', element: <MailPage /> },
      { path: 'chat', element: <ChatPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'kanban', element: <KanbanPage /> },
      { path: 'permission', element: <PermissionDeniedPage /> },
      { path: 'params', element: <ParamsPage /> },
      { path: 'blank', element: <BlankPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'settings/:section', element: <SettingsPage /> },
      { path: 'profile', element: <AdminProfilePage /> },
    ],
  },
];


