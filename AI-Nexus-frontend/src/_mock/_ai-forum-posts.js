import { _mock } from './_mock';

// ----------------------------------------------------------------------

const QUESTION_CATEGORIES = ['help', 'troubleshooting', 'workflow-building', 'node', 'core', 'ai', 'oauth2', 'http-request', 'data-transformation'];
const QUESTION_STATUS = ['open', 'solved', 'unsolved', 'closed'];

const QUESTION_TITLES = [
  'New category: "Help me Build my Workflow"',
  'About the AI Forum category',
  'Help with splitting ai output into separate items',
  'Did not receive Activation/License Key email for new self-hosted setup',
  'Form problem with optional number field',
  'Help Needed - Run all IF conditions in parallel',
  'Reddit client id and client secret key',
  'Looking for Guidance on Hands-On n8n Practice Platforms',
  'I did not receive my unique ID of my LV2 Course email',
  'Workflows Error out, but don\'t show any error message or execution data',
  'Need reliable method to clean and structure complex Apify Skip Trace JSON for OpenAI',
  'MCP Partial Rebuild Fail',
  'Is it possible to use newly added sonnet models with Azure AI Foundry using Azure OpenAI Chat Model?',
  'Help to Install Jogg AI Community Node',
  'I\'m trying to generate a free license, but I\'m not receiving the email',
  'Not receiving my License key (VPS via Hostinger)',
  'Vague "Problem in node \'Basic LLM Chain\' terminated"',
  'Extract multiple sheet names from excel file',
  'N8n doesn\'t work for me',
  'External runners don\'t work',
  'TikTok OAuth2 Callback Returning 404 on Self-Hosted n8n (Hostinger)',
  'Gmail Automation',
  'New built-in LLM',
  'SQLITE_ERROR: no such column: NaN - when resume wait node',
  'Help with Updating versions - not working',
  'UNSOLVED: How can I store images in a knowledge base [vector store], and what is the process for retrieving them later?',
  'Struggling to combine runs from 2 different nodes together with specific mappings',
  'Error details mix data together from multiple executions',
];

const QUESTION_CONTENTS = [
  'As the number of posts in AI Forum kept growing, we decided to separate basic n8n usage posts from more complex workflow-building discussions. Since n8n staff can\'t design workflows for everyone, we\'ve made that a community initiative where experienced users can help others build their workflows.',
  'Ask all posts you have on n8n. For troubleshooting issues, understanding nodes, or reporting bugs—if you\'re building a workflow and need help shaping it, post in Help me Build my Workflow instead. If you have a problem with your setup, search first to see if it\'s been answered.',
  'I\'m trying to split AI output into separate items for further processing. The output comes as a single text block with multiple entries separated by newlines. How can I parse this into individual items?',
  'I set up a self-hosted instance yesterday and filled out the form to get my activation key, but I haven\'t received the email yet. I\'ve checked my spam folder and waited 24 hours. What should I do?',
  'I have a form with an optional number field. When the field is left empty, the workflow throws an error saying it expected a number but got null. How can I handle optional number fields properly?',
  'I need to run multiple IF conditions in parallel and collect all the results. Currently, they run sequentially which is too slow. Is there a way to execute all IF nodes at the same time?',
  'Where can I find my Reddit API client ID and client secret key? I\'ve created an app in Reddit\'s preferences but I\'m not sure which values to use in the n8n Reddit node.',
  'I\'m new to n8n and looking for hands-on practice platforms or guided learning resources to learn by doing. Are there any recommended resources or practice environments where I can build real workflows?',
  'I completed Level 2 of the course but didn\'t receive the email with my unique ID. I\'ve checked spam and waited a day. How can I retrieve my course completion ID?',
  'My workflows are showing as errored but there\'s no error message displayed, no execution data visible, and the error workflow doesn\'t trigger. This makes debugging impossible. Any ideas what could cause this?',
  'I\'m working with Apify Skip Trace data that comes in complex nested JSON format. I need to clean and structure this data before sending it to OpenAI. What\'s the most reliable approach to handle this transformation?',
  'Getting a partial rebuild failure when working with MCP. The build process starts but fails halfway through without a clear error message. Has anyone encountered this issue?',
  'I want to use the newly added Claude Sonnet models with Azure AI Foundry through the Azure OpenAI Chat Model node. Is this currently supported, and if so, what configuration is needed?',
  'I\'m trying to install the Jogg AI community node but running into issues. I\'ve followed the documentation but the node doesn\'t appear in my node list after installation. Any troubleshooting steps?',
  'I filled out the form to generate a free license for my self-hosted instance, but the email never arrives. I\'ve tried multiple times and checked spam. Is there an alternative way to get the license?',
  'Set up n8n on a VPS through Hostinger but haven\'t received my license key email. It\'s been over 48 hours. Is there a way to resend or retrieve the license key?',
  'Getting a vague error: "Problem in node \'Basic LLM Chain\' terminated" with no additional details. The workflow just stops at this node. How can I get more information about what\'s failing?',
  'I need to extract multiple sheet names from an Excel file to process each sheet separately. Is there a way to get all sheet names as an array using the Excel node?',
  'I\'ve installed n8n but it doesn\'t work. When I try to access the interface, I just get a blank page. I\'m running it in Docker on Ubuntu. What could be wrong?',
  'External runners are configured but not working. The tasks queue up but never execute. I\'ve checked the runner logs and they show as connected. What am I missing?',
  'Setting up TikTok OAuth2 on self-hosted n8n (Hostinger). The OAuth flow starts but the callback returns 404. I\'ve set up the redirect URL correctly in TikTok developer portal. Any suggestions?',
  'I want to automate my Gmail workflows - reading emails, sending automated responses, and organizing based on content. What\'s the best approach to set up Gmail automation securely?',
  'Just noticed a new built-in LLM feature. How does this compare to using the OpenAI nodes? What are the advantages of the built-in option?',
  'Getting "SQLITE_ERROR: no such column: NaN" when trying to resume a wait node. This happens intermittently. The workflow works fine most of the time but fails randomly with this database error.',
  'I\'m trying to update from version 1.x to the latest version but the update process isn\'t working. The update command runs without errors but the version doesn\'t change. Any tips?',
  'UNSOLVED: How can I store images in a knowledge base or vector store, and what is the process for retrieving them later? I need to store product images with descriptions for similarity search.',
  'I have two different nodes producing data and I need to combine their outputs with specific field mappings. The Merge node doesn\'t seem to do what I need. How can I combine runs from different branches?',
  'Error details from multiple executions are getting mixed together in the error workflow. When multiple instances fail, I can\'t tell which error belongs to which execution. How to separate them?',
];

// ----------------------------------------------------------------------

export const _posts = [...Array(28)].map((_, index) => ({
  id: _mock.id(index),
  title: QUESTION_TITLES[index],
  content: QUESTION_CONTENTS[index],
  excerpt: `${QUESTION_CONTENTS[index].substring(0, 150)}...`,
  category: QUESTION_CATEGORIES[index % QUESTION_CATEGORIES.length],
  status: QUESTION_STATUS[index % QUESTION_STATUS.length],
  isPinned: index < 2, // First 2 are pinned
  isSolved: index % 4 === 0, // Every 4th is solved
  isUnsolved: index === 25, // One specific unsolved
  author: {
    id: _mock.id(index + 200),
    name: _mock.fullName(index),
    avatarUrl: _mock.image.avatar(index),
  },
  participants: [...Array(Math.min(5, Math.floor(Math.random() * 5) + 1))].map((__, idx) => ({
    id: _mock.id(index * 10 + idx + 500),
    name: _mock.fullName(index * 10 + idx),
    avatarUrl: _mock.image.avatar(index * 10 + idx),
    role: ['Developer', 'Expert', 'Member', 'Moderator', 'Admin'][idx % 5],
    status: idx % 3 === 0 ? "This user's public profile is hidden." : 'Active community member',
    posts: Math.floor(Math.random() * 500) + 10,
    reputation: Math.floor(Math.random() * 5000) + 100,
  })),
  replies: [39, 1, 0, 1, 0, 1, 0, 0, 0, 1, 18, 0, 3, 0, 2, 1, 2, 3, 1, 4, 0, 1, 0, 4, 1, 0, 1, 4][index] || Math.floor(Math.random() * 20),
  views: [7500, 3500, 1, 4, 2, 4, 3, 3, 3, 15, 44, 3, 96, 5, 12, 9, 34, 27, 30, 32, 9, 18, 6, 7, 13, 6, 23, 55][index] || Math.floor(Math.random() * 100),
  publishedAt: _mock.time(index),
  createdAt: _mock.time(index),
  lastActivity: ['3d', 'Sep 2019', '3m', '5m', '7m', '10m', '23m', '33m', '35m', '2h', '2h', '2h', '3h', '3h', '4h', '4h', '4h', '4h', '5h', '5h', '6h', '7h', '8h', '9h', '10h', '11h', '12h', '13h'][index] || '1d',
  tags: index < 14 ? [QUESTION_CATEGORIES[index % QUESTION_CATEGORIES.length]] : [],
}));


