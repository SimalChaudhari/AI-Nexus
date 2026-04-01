import { paths } from 'src/routes/paths';

// ----------------------------------------------------------------------

export const navData = [
  {
    title: 'Learning',
    path: paths.learning,
  },
  {
    title: 'AI Resources',
    path: paths.workflows,
    // Keep nav active on nested routes (e.g. /ai-resources/prompt/chatgpt)
    deepMatch: true,
  },
  {
    title: 'AI Forum',
    path: paths.aiForum.root,
    // Keep nav active on detail routes (e.g. /ai-forum/:id)
    deepMatch: true,
    children: [
      {
        items: [
          {
            title: 'Forum',
            path: paths.aiForum.root,
          },
          {
            title: 'Announcements',
            path: paths.announcements,
          },
        ],
      },
    ],
  },
  {
    title: 'Categories',
    path: '/categories',
  },
];


