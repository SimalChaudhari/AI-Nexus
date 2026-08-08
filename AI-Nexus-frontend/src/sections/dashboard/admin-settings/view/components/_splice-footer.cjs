const fs = require('fs');

const path =
  'c:/list-projects/AI-Nexus/AI-Nexus-frontend/src/sections/dashboard/admin-settings/view/components/international-landing-settings-card.jsx';
const replacementPath =
  'c:/list-projects/AI-Nexus/AI-Nexus-frontend/src/sections/dashboard/admin-settings/view/components/_footer-tab.part.jsx';

const src = fs.readFileSync(path, 'utf8');
const replacement = fs.readFileSync(replacementPath, 'utf8').replace(/\r\n/g, '\n');

const startToken = "          {tab === 'footer' ? (";
const endToken = '          <Box>\n            <LoadingButton variant="contained" loading={submitting} onClick={onSave}>';

const normalized = src.replace(/\r\n/g, '\n');
const start = normalized.indexOf(startToken);
const end = normalized.indexOf(endToken);

if (start < 0 || end < 0) {
  console.error('Could not find markers', { start, end });
  process.exit(1);
}

const out = normalized.slice(0, start) + replacement + normalized.slice(end);
fs.writeFileSync(path, out);
fs.unlinkSync(replacementPath);
fs.unlinkSync(__filename);
console.log('Footer tab replaced successfully');
