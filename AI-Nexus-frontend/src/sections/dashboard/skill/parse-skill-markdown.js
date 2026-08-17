function stripQuotes(value) {
  const text = String(value ?? '').trim();
  if (
    (text.startsWith('"') && text.endsWith('"') && text.length >= 2) ||
    (text.startsWith("'") && text.endsWith("'") && text.length >= 2)
  ) {
    const inner = text.slice(1, -1);
    try {
      if (text.startsWith('"')) {
        return JSON.parse(text);
      }
    } catch {
      // YAML-style quotes; keep inner text.
    }
    return inner.replace(/\\n/g, '\n');
  }
  return text;
}

function slugifyName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function firstHeading(markdown) {
  const match = String(markdown || '').match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || '';
}

export function parseSkillMarkdown(raw) {
  const text = String(raw || '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n');

  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const yamlBlock = match ? match[1] : '';
  const body = (match ? match[2] : text).trim();

  const extraFields = [];
  let name = '';
  let description = '';
  let license = '';

  yamlBlock.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const separator = trimmed.indexOf(':');
    if (separator <= 0) return;

    const key = trimmed.slice(0, separator).trim();
    const value = stripQuotes(trimmed.slice(separator + 1));
    if (!key) return;

    if (key === 'name') name = slugifyName(value) || value.trim();
    else if (key === 'description') description = value;
    else if (key === 'license') license = value;
    else extraFields.push({ key, value });
  });

  const title = firstHeading(body) || name;

  return {
    name,
    title,
    description,
    license,
    extraFields,
    content: body,
  };
}

export function buildSkillMarkdown({ name, description, license, extraFields, content }) {
  const lines = ['---'];
  if (name) lines.push(`name: ${name}`);
  if (description) {
    const needsQuotes = /[:#\n]/.test(description) || description.includes('"');
    lines.push(needsQuotes ? `description: ${JSON.stringify(description)}` : `description: ${description}`);
  }
  if (license) lines.push(`license: ${license}`);
  (extraFields || []).forEach((field) => {
    if (!field?.key) return;
    lines.push(`${field.key}: ${field.value ?? ''}`);
  });
  lines.push('---');
  return `${lines.join('\n')}\n\n${String(content || '').trim()}`.trim();
}
