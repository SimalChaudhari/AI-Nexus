/** User-facing copy for the AI Resources → AI Playbook Prompts area. */

export const AI_PLAYBOOKS_PROMPTS_TITLE = 'AI Playbook Prompts';

export const AI_PLAYBOOKS_PROMPT_LABEL = 'AI Playbook Prompt';

export function formatPlaybookPromptCount(count) {
  const n = Number(count) || 0;
  return `${n} ${n === 1 ? 'playbook prompt' : 'playbook prompts'}`;
}
