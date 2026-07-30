import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { MainLayout } from 'src/layouts/main';
import { SimpleLayout } from 'src/layouts/simple';

import { SplashScreen } from 'src/components/loading-screen';
import { MainRouteFallback } from 'src/routes/components/main-route-fallback';
import { PublicGuard, AuthGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

const HomePage = lazy(() => import('src/pages/home'));
const CategoriesPage = lazy(() => import('src/pages/categories'));
const AnnouncementsPage = lazy(() => import('src/pages/announcements'));
const AiForumPage = lazy(() => import('src/pages/ai-forum'));
const AiForumDetailPage = lazy(() => import('src/pages/ai-forum/detail'));
const AboutPage = lazy(() => import('src/pages/about-us'));
const ContactPage = lazy(() => import('src/pages/contact-us'));
const PricingPage = lazy(() => import('src/pages/pricing'));
const PaymentPage = lazy(() => import('src/pages/payment'));
const ComingSoonPage = lazy(() => import('src/pages/coming-soon'));
const MaintenancePage = lazy(() => import('src/pages/maintenance'));
const LearningPage = lazy(() => import('src/pages/learning'));
const LearningCourseDetailsPage = lazy(() => import('src/pages/learning/course-details'));
// eslint-disable-next-line import/no-unresolved -- dynamic import; module exists at src/pages/learning/course-player.jsx
const LearningCoursePlayerPage = lazy(() => import('src/pages/learning/course-player'));
const LearningInstructorDetailsPage = lazy(() => import('src/pages/learning/instructor-details'));
const WorkflowsPage = lazy(() => import('src/pages/workflows'));
const AiAuditFuturesPage = lazy(() => import('src/pages/ai-audit-futures'));
const PartnerWithIscaPage = lazy(() => import('src/pages/partner-with-isca'));
const InternationalPage = lazy(() => import('src/pages/international'));
const InternationalAiFluencyPage = lazy(() => import('src/pages/international/ai-fluency'));
const WorkflowCreatePage = lazy(() => import('src/pages/dashboard/workflow/new'));
const WorkflowDetailsPage = lazy(() => import('src/pages/workflows/details'));
const WorkflowPromptDetailsPage = lazy(() => import('src/pages/workflows/prompt-details'));
// Product
const ProductListPage = lazy(() => import('src/pages/product/list'));
const ProductDetailsPage = lazy(() => import('src/pages/product/details'));
const ProductCheckoutPage = lazy(() => import('src/pages/product/checkout'));
const ProductCheckoutSuccessPage = lazy(() => import('src/pages/product/checkout-success'));
// Blog
const PostListPage = lazy(() => import('src/pages/post/list'));
const PostDetailsPage = lazy(() => import('src/pages/post/details'));
// Error
const Page500 = lazy(() => import('src/pages/error/500'));
const Page403 = lazy(() => import('src/pages/error/403'));
const Page404 = lazy(() => import('src/pages/error/404'));
// Blank
const BlankPage = lazy(() => import('src/pages/blank'));

// ----------------------------------------------------------------------

export const mainRoutes = [
  {
    element: (
      <PublicGuard>
        <Outlet />
      </PublicGuard>
    ),
    children: [
      {
        element: (
          <MainLayout>
            <Suspense fallback={<MainRouteFallback />}>
              <Outlet />
            </Suspense>
          </MainLayout>
        ),
        children: [
          {
            path: 'home',
            element: <HomePage />,
          },
          {
            path: 'categories',
            element: <CategoriesPage />,
          },
          {
            path: 'announcements',
            element: <AnnouncementsPage />,
          },
          {
            path: 'ai-forum',
            children: [
              { element: <AiForumPage />, index: true },
              { path: ':id', element: <AiForumDetailPage /> },
            ],
          },
          {
            path: 'about-us',
            element: <AboutPage />,
          },
          {
            path: 'contact-us',
            element: <ContactPage />,
          },
          {
            path: 'blank',
            element: <BlankPage />,
          },
          {
            path: 'product',
            children: [
              { element: <ProductListPage />, index: true },
              { path: 'list', element: <ProductListPage /> },
              { path: ':id', element: <ProductDetailsPage /> },
              { path: 'checkout', element: <ProductCheckoutPage /> },
              { path: 'checkout/success', element: <ProductCheckoutSuccessPage /> },
            ],
          },
          {
            path: 'post',
            children: [
              { element: <PostListPage />, index: true },
              { path: 'list', element: <PostListPage /> },
              { path: ':title', element: <PostDetailsPage /> },
            ],
          },
          {
            path: 'learning',
            children: [
              { element: <LearningPage />, index: true },
              { path: 'course/:id', element: <LearningCourseDetailsPage /> },
              {
                path: 'course/:id/learn',
                element: (
                  <AuthGuard>
                    <LearningCoursePlayerPage />
                  </AuthGuard>
                ),
              },
            ],
          },
          {
            path: 'speaker/:id',
            element: <LearningInstructorDetailsPage />,
          },
          {
            path: 'ai-resources',
            element: <WorkflowsPage />,
          },
          {
            path: 'ai-audit-futures',
            element: <AiAuditFuturesPage />,
          },
          {
            path: 'partner-with-isca',
            element: <PartnerWithIscaPage />,
          },
          {
            path: 'ai-resources/agent-flow',
            element: <WorkflowCreatePage />,
          },
          {
            path: 'ai-resources/:id',
            element: <WorkflowDetailsPage />,
          },
          {
            path: 'ai-resources/prompt/:provider',
            element: <WorkflowPromptDetailsPage />,
          },
        ],
      },
      // International landing + AI Fluency pathway (shared SG main nav)
      {
        element: (
          <MainLayout>
            <Suspense fallback={<MainRouteFallback />}>
              <Outlet />
            </Suspense>
          </MainLayout>
        ),
        children: [
          {
            path: 'international',
            element: <InternationalPage />,
          },
          {
            path: 'international/ai-fluency',
            element: <InternationalAiFluencyPage />,
          },
        ],
      },
      {
        path: 'pricing',
        element: (
          <SimpleLayout>
            <PricingPage />
          </SimpleLayout>
        ),
      },
      {
        path: 'payment',
        element: (
          <SimpleLayout>
            <PaymentPage />
          </SimpleLayout>
        ),
      },
      {
        path: 'coming-soon',
        element: (
          <SimpleLayout content={{ compact: true }}>
            <ComingSoonPage />
          </SimpleLayout>
        ),
      },
      {
        path: 'maintenance',
        element: (
          <SimpleLayout content={{ compact: true }}>
            <MaintenancePage />
          </SimpleLayout>
        ),
      },
    ],
  },
  // Error pages - accessible to everyone (no guards)
  {
    element: (
      <Suspense fallback={<SplashScreen />}>
        <Outlet />
      </Suspense>
    ),
    children: [
      { path: '500', element: <Page500 /> },
      { path: '404', element: <Page404 /> },
      { path: '403', element: <Page403 /> },
    ],
  },
];
