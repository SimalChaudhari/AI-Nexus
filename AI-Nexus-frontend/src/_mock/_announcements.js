import { _mock } from './_mock';

// ----------------------------------------------------------------------

const ANNOUNCEMENT_TYPES = ['info', 'update', 'event', 'release', 'community'];
const ANNOUNCEMENT_PRIORITIES = ['normal', 'high', 'urgent'];

const ANNOUNCEMENT_TITLES = [
  'Announcing AI Nexus version 2.0 - coming soon!',
  'We Need Your Help! (Answer & Earn)',
  'Organize your workspace with Folders',
  'Level 1 Course update',
  'Unlock three features for free on your self-hosted community edition!',
  'New Course Updates Available',
  'README - Welcome to the AI Nexus community',
  'Join our Ambassador Program! ☀️',
  'Passionate about AI? Join our team! 😀',
  'The AI Nexus community is now on Discord! ☁️',
  'New Workflow Creation Tool Released',
  'Request for feedback: AI Evaluation beta',
  'New on the platform: Community Highlights',
  'August Livestream: Share your posts about our recent updates',
  'Help us test the new AI Evaluation feature 🤖',
  '100k stars on GitHub! 🎉',
  "We're adding new AI tools - try them now!",
  'Paid features coming soon: info on plans and pricing',
  'New fonts. New vibes. Same automation magic',
  'Our research on AI agent development tools',
  'We reached 75k GitHub Stars!',
  '☀️ Exciting News! The Creator Hub is here!',
  'AI Nexus closes €55M Series B round',
  'Help Us Test the New Canvas (Beta)',
  'Automatic theme switching enabled',
  'Task Runners for Code node: public beta release',
  'Share Your Creations: Introducing the AI Starter Kit! 🚀',
];

const ANNOUNCEMENT_CONTENTS = [
  "I'm excited to share that we'll soon be releasing AI Nexus version 2.0.0 (v2 for short), with a focus on security, reliability, and performance. It's been over two years since we released version 1.0.0. Since then, we've added hundreds of new features and improvements based on your feedback.",
  'We value your expertise and experience! Help fellow community members by answering their posts. Active contributors will be eligible for exclusive rewards and recognition in our community.',
  'Great news! We\'re introducing workspace folders to help you better organize your projects. Now you can group related workflows, courses, and resources in custom folders. This feature is available for all users starting today.',
  'Our Level 1 Course has been updated with new content covering the latest AI techniques and best practices. Existing students will have access to all new materials automatically.',
  'As part of our commitment to the community, we\'re making three premium features available for free to self-hosted users: Advanced Analytics, Custom Branding, and Team Collaboration tools.',
  'Multiple courses have been updated with fresh content, new examples, and improved exercises. Check your enrolled courses to see what\'s new!',
  'Welcome to AI Nexus! This community is dedicated to helping you learn, build, and share AI-powered solutions. Start by introducing yourself and exploring our resources.',
  'Calling all AI enthusiasts! Our new Ambassador Program is looking for passionate community members to represent AI Nexus at events, create content, and help grow our community.',
  'We\'re hiring! If you\'re passionate about AI and want to help shape the future of intelligent automation, check out our open positions. We\'re looking for engineers, designers, and community managers.',
  'Join us on Discord for real-time conversations, support, and community events. Our Discord server is the perfect place to connect with other AI enthusiasts and get quick answers to your posts.',
  'Introducing our new Workflow Creation Tool! Build complex AI workflows visually with drag-and-drop simplicity. Includes templates and AI-powered suggestions.',
  'We\'re testing a new AI Evaluation feature and need your feedback! This tool helps you assess the performance and accuracy of your AI models. Join the beta program to get early access.',
  'Check out the new Community Highlights section on our homepage! Each week we\'ll feature outstanding projects, helpful community members, and interesting discussions.',
  'Join us for a live Q&A session about our recent platform updates. Bring your posts and suggestions - we\'d love to hear from you!',
  'We need beta testers for our new AI Evaluation feature! This tool provides detailed insights into your AI model performance with automated testing and reporting.',
  'Huge milestone! We just reached 100,000 stars on GitHub. Thank you to everyone who has supported this project. Here\'s to the next 100k!',
  'Exciting news! We\'re introducing new AI integration tools including enhanced language models, image processing, and data analysis capabilities.',
  'As we continue to grow, we\'re introducing new paid features for enterprise users while keeping our core platform free. Learn more about our pricing plans and what\'s included.',
  'We\'ve refreshed our design! Enjoy a new modern interface with improved typography and better accessibility. All the features you love, now with a fresh look.',
  'Our research team has published findings on AI agent development tools and best practices. Read the full report to learn about emerging trends and methodologies.',
  'Another milestone! We\'ve reached 75,000 stars on GitHub. Thanks to our amazing community for your continued support and contributions.',
  'The Creator Hub is now live! Discover tools, templates, and resources to accelerate your AI development. Share your creations and get inspired by others.',
  'Big news! We\'ve closed a €55M Series B funding round led by Highland Europe. This investment will help us accelerate product development and expand our team.',
  'We\'re redesigning our canvas interface and need your help testing it! Join the beta program to try new features like smart layouts, better zoom controls, and improved navigation.',
  'The platform now supports automatic theme switching based on your system preferences. Dark mode and light mode will automatically match your OS settings.',
  'Public beta release! Task Runners allow you to execute custom code nodes in isolated environments for better security and performance.',
  'Get started with AI quickly using our new Self-hosted AI Starter Kit! Includes pre-configured workflows, templates, and documentation for common use cases.',
];

// ----------------------------------------------------------------------

export const _announcements = [...Array(27)].map((_, index) => ({
  id: _mock.id(index),
  title: ANNOUNCEMENT_TITLES[index],
  content: ANNOUNCEMENT_CONTENTS[index],
  excerpt: `${ANNOUNCEMENT_CONTENTS[index].substring(0, 150)}...`,
  type: ANNOUNCEMENT_TYPES[index % ANNOUNCEMENT_TYPES.length],
  priority: ANNOUNCEMENT_PRIORITIES[index % ANNOUNCEMENT_PRIORITIES.length],
  isPinned: index < 3, // First 3 are pinned
  isHighlight: index < 5, // First 5 are highlights
  author: {
    id: _mock.id(index + 100),
    name: _mock.fullName(index),
    avatarUrl: _mock.image.avatar(index),
  },
  participants: [...Array(Math.min(5, Math.floor(Math.random() * 6) + 1))].map((__, idx) => ({
    id: _mock.id(index * 10 + idx),
    name: _mock.fullName(index * 10 + idx),
    avatarUrl: _mock.image.avatar(index * 10 + idx),
    role: ['Developer', 'Expert', 'Member', 'Moderator', 'Admin'][idx % 5],
    status: idx % 3 === 0 ? "This user's public profile is hidden." : 'Active community member',
    posts: Math.floor(Math.random() * 500) + 10,
    reputation: Math.floor(Math.random() * 5000) + 100,
  })),
  replies: [85, 205, 0, 53, 43, 44, 1, 13, 75, 91, 9, 37, 23, 2, 9, 35, 27, 3, 5, 34, 137, 30, 96, 26, 13, 8, 75][index] || Math.floor(Math.random() * 100),
  views: ['51.1k', '46.8k', '3.5k', '2.4k', '8.7k', '1.4k', '1.8k', '213', '966', '16.4k', '2.3k', '46.3k', '4.3k', '2.2k', '6.7k', '758', '2.1k', '1.5k', '1.1k', '2.0k', '2.1k', '1.5k', '29.5k', '8.8k', '986', '494', '1.9k'][index] || '1.2k',
  publishedAt: _mock.time(index),
  createdAt: _mock.time(index),
  lastActivity: ['23m', '17h', '9d', '10d', '13d', '14d', '15d', '16d', 'Nov 4', 'Oct 28', 'Oct 25', 'Oct 24', 'Oct 23', 'Oct 22', 'Oct 6', 'Sep 4', 'Sep 1', 'Aug 21', 'Aug 4', 'Jul 31', 'Jul 14', 'Jul 9', 'Jul 4', 'Jul 1', 'Jun 22', 'Jun 2', 'May 23'][index] || '1d',
  tags: index < 10 ? ['announcement', 'important'] : ['announcement'],
}));


