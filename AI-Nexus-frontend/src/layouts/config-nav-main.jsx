import { paths } from 'src/routes/paths';

// ----------------------------------------------------------------------

export const navData = [
  {
    title: 'Learning',
    path: paths.learning,
    icon: 'solar:book-2-bold-duotone',
    iconColor: '#2065D1',
  },
  {
    title: 'AI Resources',
    path: paths.workflows,
    // Keep nav active on nested routes (e.g. /ai-resources/prompt/chatgpt)
    deepMatch: true,
    icon: 'solar:widget-bold-duotone',
    iconColor: '#8E33FF',
  },
  {
    title: 'AI Readiness Assessment',
    path: paths.aiAuditFutures,
    icon: 'solar:clipboard-check-bold-duotone',
    iconColor: '#00A76F',
  },
  {
    title: 'Partner with ISCA',
    path: paths.partnerWithIsca,
    icon: 'solar:hand-shake-bold-duotone',
    iconColor: '#00A76F',
  },
  {
    title: 'International',
    path: paths.international,
    icon: 'solar:global-bold-duotone',
    iconColor: '#0f766e',
  },
  {
    title: 'AI Forum',
    path: paths.aiForum.root,
    // Keep nav active on detail routes (e.g. /ai-forum/:id)
    deepMatch: true,
    icon: 'solar:chat-round-bold-duotone',
    iconColor: '#FF6B35',
    children: [
      {
        items: [
          {
            title: 'Announcements',
            path: paths.announcements,
            icon: 'solar:bell-bing-bold-duotone',
            iconColor: '#FF5630',
          },
          {
            title: 'Forum',
            path: paths.aiForum.root,
            icon: 'solar:chat-round-dots-bold-duotone',
            iconColor: '#00B8D9',
          },
        ],
      },
    ],
  },
  // {
  //   title: 'Categories',
  //   path: '/categories',
  // },
];


