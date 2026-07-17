import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/config-global';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name) => <SvgColor src={`${CONFIG.site.basePath}/assets/icons/navbar/${name}.svg`} />;

const ICONS = {
  job: icon('ic-job'),
  blog: icon('ic-blog'),
  chat: icon('ic-chat'),
  mail: icon('ic-mail'),
  user: icon('ic-user'),
  file: icon('ic-file'),
  lock: icon('ic-lock'),
  tour: icon('ic-tour'),
  order: icon('ic-order'),
  label: icon('ic-label'),
  blank: icon('ic-blank'),
  kanban: icon('ic-kanban'),
  folder: icon('ic-folder'),
  course: icon('ic-course'),
  banking: icon('ic-banking'),
  booking: icon('ic-booking'),
  invoice: icon('ic-invoice'),
  product: icon('ic-product'),
  calendar: icon('ic-calendar'),
  disabled: icon('ic-disabled'),
  external: icon('ic-external'),
  menuItem: icon('ic-menu-item'),
  ecommerce: icon('ic-ecommerce'),
  analytics: icon('ic-analytics'),
  dashboard: icon('ic-dashboard'),
  announcement: icon('ic-announcement'),
  parameter: icon('ic-parameter'),
  category: icon('ic-category'),
  tag: icon('ic-tag'),
  community: icon('ic-community'),
  workflow: icon('ic-workflow'),
  settings: icon('ic-settings'),
};

// ----------------------------------------------------------------------

export const navData = [
  /**
   * Overview
   */
  // {
  //   subheader: 'Overview',
  //   items: [
  //     { title: 'App', path: paths.dashboard.root, icon: ICONS.dashboard },
  //     { title: 'Ecommerce', path: paths.dashboard.general.ecommerce, icon: ICONS.ecommerce },
  //     { title: 'Analytics', path: paths.dashboard.general.analytics, icon: ICONS.analytics },
  //     { title: 'Banking', path: paths.dashboard.general.banking, icon: ICONS.banking },
  //     { title: 'Booking', path: paths.dashboard.general.booking, icon: ICONS.booking },
  //     { title: 'File', path: paths.dashboard.general.file, icon: ICONS.file },
  //     { title: 'Course', path: paths.dashboard.general.course, icon: ICONS.course },
  //   ],
  // },
  /**
   * Management
   */
  {
    subheader: 'Management',
    items: [
      {
        title: 'Dashboard',
        path: paths.dashboard.root,
        icon: ICONS.dashboard,
      },
      {
        title: 'Users',
        path: paths.admin.user.root,
        icon: ICONS.user,
        children: [
          {
            title: 'All users',
            path: paths.admin.user.root,
            deepMatch: true,
            href: paths.admin.user.list,
            activeExcludePaths: [paths.admin.user.new],
          },
          { title: 'Add user', path: paths.admin.user.new },
        ],
      },
      {
        title: 'Announcements',
        path: paths.admin.announcement.root,
        icon: ICONS.announcement,
        children: [
          {
            title: 'All announcements',
            path: paths.admin.announcement.root,
            deepMatch: true,
            href: paths.admin.announcement.list,
            activeExcludePaths: [paths.admin.announcement.new],
          },
          { title: 'Add announcement', path: paths.admin.announcement.new },
        ],
      },
      {
        title: 'AI Forums',
        path: paths.admin.aiForum.root,
        icon: <Iconify icon="solar:chat-round-bold-duotone" width={24} />,
        children: [
          {
            title: 'All forums',
            path: paths.admin.aiForum.root,
            deepMatch: true,
            href: paths.admin.aiForum.list,
            activeExcludePaths: [paths.admin.aiForum.new],
          },
          { title: 'Add forum', path: paths.admin.aiForum.new },
        ],
      },
      {
        title: 'Courses',
        path: paths.admin.course.root,
        icon: ICONS.course,
        children: [
          {
            title: 'All courses',
            path: paths.admin.course.root,
            deepMatch: true,
            href: paths.admin.course.list,
            activeExcludePaths: [paths.admin.course.new],
          },
          { title: 'Categories', path: paths.admin.category.root, deepMatch: true },
          { title: 'Quiz attempts', path: paths.admin.course.attempts },
          { title: 'Certificates', path: paths.admin.course.certificates },
        ],
      },
      {
        title: 'Speakers',
        path: paths.admin.speaker.root,
        icon: <Iconify icon="solar:microphone-bold-duotone" width={24} />,
        children: [
          {
            title: 'All speakers',
            path: paths.admin.speaker.root,
            deepMatch: true,
            href: paths.admin.speaker.list,
            activeExcludePaths: [paths.admin.speaker.new],
          },
          { title: 'Add speaker', path: paths.admin.speaker.new },
        ],
      },
      {
        title: 'Languages',
        path: paths.admin.language.root,
        icon: <Iconify icon="solar:global-bold-duotone" width={24} />,
        children: [
          {
            title: 'All languages',
            path: paths.admin.language.root,
            deepMatch: true,
            href: paths.admin.language.list,
            activeExcludePaths: [paths.admin.language.new],
          },
          { title: 'Add language', path: paths.admin.language.new },
        ],
      },
      {
        title: 'Orders',
        path: paths.admin.order.root,
        icon: ICONS.order,
        children: [
          {
            title: 'All orders',
            path: paths.admin.order.root,
            deepMatch: true,
            href: paths.admin.order.list,
          },
        ],
      },
      {
        title: 'Corporate Members',
        path: paths.admin.corporateMember.root,
        icon: <Iconify icon="solar:buildings-3-bold-duotone" width={24} />,
      },
      {
        title: 'Labels',
        path: paths.admin.label.root,
        icon: ICONS.label,
        children: [
          {
            title: 'All labels',
            path: paths.admin.label.root,
            deepMatch: true,
            href: paths.admin.label.list,
            activeExcludePaths: [paths.admin.label.new],
          },
          { title: 'Add label', path: paths.admin.label.new },
        ],
      },
      {
        title: 'Tags',
        path: paths.admin.tag.root,
        icon: ICONS.tag,
        children: [
          {
            title: 'All tags',
            path: paths.admin.tag.root,
            deepMatch: true,
            href: paths.admin.tag.list,
            activeExcludePaths: [paths.admin.tag.new],
          },
          { title: 'Add tag', path: paths.admin.tag.new },
        ],
      },
      {
        title: 'AI Resources',
        path: paths.admin.workflow.root,
        icon: ICONS.workflow,
        activePathPrefixes: [paths.admin.prompt.root],
        children: [
          {
            title: 'Templates',
            path: paths.admin.workflow.root,
            children: [
              {
                title: 'All templates',
                path: paths.admin.workflow.root,
                deepMatch: true,
                href: paths.admin.workflow.list,
                activeExcludePaths: [paths.admin.workflow.new],
              },
              { title: 'Add template', path: paths.admin.workflow.new },
            ],
          },
          {
            title: 'Prompts',
            path: paths.admin.prompt.root,
            deepMatch: true,
          },
        ],
      },
      {
        title: 'Settings',
        path: paths.admin.settings,
        icon: ICONS.settings,
      },
      // {
      //   title: 'Category',
      //   path: paths.admin.category.list,
      //   icon: ICONS.category,
      //   children: [
      //     { title: 'List', path: paths.admin.category.list },
      //   ],
      // },
      // {
      //   title: 'Product',
      //   path: paths.admin.product.list,
      //   icon: ICONS.product,
      //   children: [
      //     { title: 'List', path: paths.admin.product.list },
      //   ],
      // },
      // {
      //   title: 'Order',
      //   path: paths.dashboard.order.root,
      //   icon: ICONS.order,
      //   children: [
      //     { title: 'List', path: paths.dashboard.order.root },
      //     { title: 'Details', path: paths.dashboard.order.demo.details },
      //   ],
      // },
      // {
      //   title: 'Invoice',
      //   path: paths.dashboard.invoice.root,
      //   icon: ICONS.invoice,
      //   children: [
      //     { title: 'List', path: paths.dashboard.invoice.root },
      //     { title: 'Details', path: paths.dashboard.invoice.demo.details },
      //     { title: 'Create', path: paths.dashboard.invoice.new },
      //     { title: 'Edit', path: paths.dashboard.invoice.demo.edit },
      //   ],
      // },
      // {
      //   title: 'Blog',
      //   path: paths.dashboard.post.root,
      //   icon: ICONS.blog,
      //   children: [
      //     { title: 'List', path: paths.dashboard.post.root },
      //     { title: 'Details', path: paths.dashboard.post.demo.details },
      //     { title: 'Create', path: paths.dashboard.post.new },
      //     { title: 'Edit', path: paths.dashboard.post.demo.edit },
      //   ],
      // },
      // {
      //   title: 'Job',
      //   path: paths.dashboard.job.root,
      //   icon: ICONS.job,
      //   children: [
      //     { title: 'List', path: paths.dashboard.job.root },
      //     { title: 'Details', path: paths.dashboard.job.demo.details },
      //     { title: 'Create', path: paths.dashboard.job.new },
      //     { title: 'Edit', path: paths.dashboard.job.demo.edit },
      //   ],
      // },
      // {
      //   title: 'Tour',
      //   path: paths.dashboard.tour.root,
      //   icon: ICONS.tour,
      //   children: [
      //     { title: 'List', path: paths.dashboard.tour.root },
      //     { title: 'Details', path: paths.dashboard.tour.demo.details },
      //     { title: 'Create', path: paths.dashboard.tour.new },
      //     { title: 'Edit', path: paths.dashboard.tour.demo.edit },
      //   ],
      // },
      // { title: 'File manager', path: paths.dashboard.fileManager, icon: ICONS.folder },
      // {
      //   title: 'Mail',
      //   path: paths.dashboard.mail,
      //   icon: ICONS.mail,
      //   info: (
      //     <Label color="error" variant="inverted">
      //       +32
      //     </Label>
      //   ),
      // },
      // { title: 'Chat', path: paths.dashboard.chat, icon: ICONS.chat },
      // { title: 'Calendar', path: paths.dashboard.calendar, icon: ICONS.calendar },
      // { title: 'Kanban', path: paths.dashboard.kanban, icon: ICONS.kanban },
    ],
  },
  /**
   * Item State
   */
  // {
  //   subheader: 'Misc',
  //   items: [
  //     {
  //       // default roles : All roles can see this entry.
  //       // roles: ['user'] Only users can see this item.
  //       // roles: ['admin'] Only admin can see this item.
  //       // roles: ['admin', 'manager'] Only admin/manager can see this item.
  //       // Reference from 'src/guards/RoleBasedGuard'.
  //       title: 'Permission',
  //       path: paths.dashboard.permission,
  //       icon: ICONS.lock,
  //       roles: ['admin', 'manager'],
  //       caption: 'Only admin can see this item',
  //     },
  //     {
  //       title: 'Level',
  //       path: '#/dashboard/menu_level',
  //       icon: ICONS.menuItem,
  //       children: [
  //         {
  //           title: 'Level 1a',
  //           path: '#/dashboard/menu_level/menu_level_1a',
  //           children: [
  //             {
  //               title: 'Level 2a',
  //               path: '#/dashboard/menu_level/menu_level_1a/menu_level_2a',
  //             },
  //             {
  //               title: 'Level 2b',
  //               path: '#/dashboard/menu_level/menu_level_1a/menu_level_2b',
  //               children: [
  //                 {
  //                   title: 'Level 3a',
  //                   path: '#/dashboard/menu_level/menu_level_1a/menu_level_2b/menu_level_3a',
  //                 },
  //                 {
  //                   title: 'Level 3b',
  //                   path: '#/dashboard/menu_level/menu_level_1a/menu_level_2b/menu_level_3b',
  //                 },
  //               ],
  //             },
  //           ],
  //         },
  //         { title: 'Level 1b', path: '#/dashboard/menu_level/menu_level_1b' },
  //       ],
  //     },
  //     {
  //       title: 'Disabled',
  //       path: '#disabled',
  //       icon: ICONS.disabled,
  //       disabled: true,
  //     },
  //     {
  //       title: 'Label',
  //       path: '#label',
  //       icon: ICONS.label,
  //       info: (
  //         <Label
  //           color="info"
  //           variant="inverted"
  //           startIcon={<Iconify icon="solar:bell-bing-bold-duotone" />}
  //         >
  //           NEW
  //         </Label>
  //       ),
  //     },
  //     {
  //       title: 'Caption',
  //       path: '#caption',
  //       icon: ICONS.menuItem,
  //       caption:
  //         'Quisque malesuada placerat nisl. In hac habitasse platea dictumst. Cras id dui. Pellentesque commodo eros a enim. Morbi mollis tellus ac sapien.',
  //     },
  //     {
  //       title: 'Params',
  //       path: '/dashboard/params?id=e99f09a7-dd88-49d5-b1c8-1daf80c2d7b1',
  //       icon: ICONS.parameter,
  //     },
  //     {
  //       title: 'External link',
  //       path: 'https://www.google.com/',
  //       icon: ICONS.external,
  //       info: <Iconify width={18} icon="prime:external-link" />,
  //     },
  //     { title: 'Blank', path: paths.dashboard.blank, icon: ICONS.blank },
  //   ],
  // },
];





