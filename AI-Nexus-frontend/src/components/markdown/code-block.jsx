import { useMemo, useState } from 'react';

import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

import { Iconify } from '../iconify';
import { markdownClasses } from './classes';

function getNodeText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(getNodeText).join('');
  if (node?.props?.children) return getNodeText(node.props.children);
  return '';
}

export function MarkdownCodeBlock({ children }) {
  const [copied, setCopied] = useState(false);
  const text = useMemo(() => getNodeText(children).replace(/\n$/, ''), [children]);

  const handleCopy = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={markdownClasses.content.codeBlock}>
      <Tooltip title={copied ? 'Copied' : 'Copy'} placement="top">
        <IconButton
          size="small"
          onClick={handleCopy}
          aria-label="Copy code"
          className={markdownClasses.content.codeCopy}
        >
          <Iconify icon={copied ? 'solar:check-read-bold' : 'solar:copy-bold'} width={16} />
        </IconButton>
      </Tooltip>
      <pre>{children}</pre>
    </div>
  );
}
