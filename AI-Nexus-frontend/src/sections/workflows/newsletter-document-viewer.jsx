import { useCallback, useEffect, useRef, useState } from 'react';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';

import { newsletterService } from 'src/services/newsletter.service';

const HEIGHT_MESSAGE_SOURCE = 'newsletter-html';

const AUTO_HEIGHT_STYLE = `
<style id="newsletter-auto-height">
  html, body {
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    overflow: visible !important;
  }
</style>
`;

const AUTO_HEIGHT_SCRIPT = `
<script>
(function () {
  function currentHeight() {
    var body = document.body;
    var html = document.documentElement;
    return Math.max(
      body ? body.scrollHeight : 0,
      body ? body.offsetHeight : 0,
      html ? html.scrollHeight : 0,
      html ? html.offsetHeight : 0
    );
  }
  function report() {
    try {
      parent.postMessage({ source: '${HEIGHT_MESSAGE_SOURCE}', height: currentHeight() }, '*');
    } catch (e) {}
  }
  window.addEventListener('load', report);
  window.addEventListener('resize', report);
  document.addEventListener('DOMContentLoaded', report);
  if (document.readyState === 'complete') report();
  else report();
  if (typeof ResizeObserver !== 'undefined') {
    var observer = new ResizeObserver(report);
    if (document.documentElement) observer.observe(document.documentElement);
    if (document.body) observer.observe(document.body);
  }
})();
</script>
`;

function injectBaseHref(html, fileUrl) {
  try {
    const baseHref = new URL('.', fileUrl).href;
    if (/<base[\s>]/i.test(html)) return html;
    if (/<head[\s>]/i.test(html)) {
      return html.replace(/<head([^>]*)>/i, `<head$1><base href="${baseHref}">`);
    }
    return `<head><base href="${baseHref}"></head>${html}`;
  } catch {
    return html;
  }
}

function prepareHtmlDocument(html, fileUrl) {
  let next = injectBaseHref(html, fileUrl);
  if (/<\/head>/i.test(next)) {
    next = next.replace(/<\/head>/i, `${AUTO_HEIGHT_STYLE}</head>`);
  } else if (/<head[^>]*>/i.test(next)) {
    next = next.replace(/<head([^>]*)>/i, `<head$1>${AUTO_HEIGHT_STYLE}`);
  } else {
    next = `<head>${AUTO_HEIGHT_STYLE}</head>${next}`;
  }
  if (/<\/body>/i.test(next)) {
    return next.replace(/<\/body>/i, `${AUTO_HEIGHT_SCRIPT}</body>`);
  }
  return `${next}${AUTO_HEIGHT_SCRIPT}`;
}

function prepareDocumentForMeasure(doc) {
  if (!doc) return;
  if (doc.documentElement) {
    doc.documentElement.style.height = 'auto';
    doc.documentElement.style.overflow = 'visible';
  }
  if (doc.body) {
    doc.body.style.height = 'auto';
    doc.body.style.overflow = 'visible';
  }
}

function getPdfViewerSrc(fileUrl) {
  if (!fileUrl) return '';
  const hash = fileUrl.includes('#') ? '&' : '#';
  return `${fileUrl}${hash}view=FitH&toolbar=1&navpanes=0`;
}

function NewsletterPdfViewer({ fileUrl, title, compact, compactHeight }) {
  const src = getPdfViewerSrc(fileUrl);
  const label = title || 'Newsletter';

  return (
    <Box
      sx={{
        width: 1,
        height: compact
          ? {
              xs: 'min(70dvh, 560px)',
              sm: compactHeight || 560,
              md: 'min(75dvh, 840px)',
            }
          : {
              xs: 'calc(100dvh - var(--layout-header-mobile-height, 64px) - 128px)',
              md: 'calc(100dvh - var(--layout-header-desktop-height, 72px) - 148px)',
            },
        minHeight: compact ? { xs: 360, sm: 480 } : { xs: 360, md: 520 },
        overflow: 'hidden',
        bgcolor: 'common.white',
        border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.16)}`,
      }}
    >
      <Box
        component="object"
        data={src}
        type="application/pdf"
        aria-label={label}
        sx={{
          display: 'block',
          width: 1,
          height: 1,
          border: 0,
          bgcolor: 'common.white',
        }}
      >
        <Box
          component="iframe"
          src={src}
          title={label}
          sx={{
            display: 'block',
            width: 1,
            height: 1,
            border: 0,
            bgcolor: 'common.white',
          }}
        />
      </Box>
    </Box>
  );
}

function measureIframeHeight(iframe) {
  try {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return 0;
    prepareDocumentForMeasure(doc);
    const body = doc.body;
    const html = doc.documentElement;
    return Math.ceil(
      Math.max(
        body?.scrollHeight || 0,
        body?.offsetHeight || 0,
        html?.scrollHeight || 0,
        html?.offsetHeight || 0
      )
    );
  } catch {
    return 0;
  }
}

// ----------------------------------------------------------------------

export function NewsletterDocumentViewer({ newsletter, minHeight, includeUnpublished }) {
  const iframeRef = useRef(null);
  const [htmlSrcDoc, setHtmlSrcDoc] = useState('');
  const [frameHeight, setFrameHeight] = useState(0);
  const [loadingHtml, setLoadingHtml] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);

  const isPdf = newsletter?.format === 'pdf';

  const applyHeight = useCallback((nextHeight) => {
    const height = Math.ceil(Number(nextHeight) || 0);
    if (height <= 0) return;
    setFrameHeight((current) => (Math.abs(current - height) < 2 ? current : height));
  }, []);

  const syncHeight = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    applyHeight(measureIframeHeight(iframe));
  }, [applyHeight]);

  useEffect(() => {
    if (!newsletter?.id || isPdf) {
      setHtmlSrcDoc('');
      setLoadingHtml(false);
      setIframeReady(false);
      return undefined;
    }

    let cancelled = false;
    setLoadingHtml(true);
    setHtmlSrcDoc('');
    setFrameHeight(0);
    setIframeReady(false);

    newsletterService
      .getNewsletterHtml(newsletter.id, { includeUnpublished: Boolean(includeUnpublished) })
      .then((html) => {
        if (!cancelled) setHtmlSrcDoc(prepareHtmlDocument(html, newsletter.fileUrl));
      })
      .catch(() => {
        if (!cancelled) setHtmlSrcDoc('');
      })
      .finally(() => {
        if (!cancelled) setLoadingHtml(false);
      });

    return () => {
      cancelled = true;
    };
  }, [includeUnpublished, isPdf, newsletter?.fileUrl, newsletter?.id]);

  useEffect(() => {
    const onMessage = (event) => {
      const data = event.data;
      if (!data || data.source !== HEIGHT_MESSAGE_SOURCE) return;
      applyHeight(data.height);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [applyHeight]);

  useEffect(() => {
    if (!iframeReady) return undefined;
    const timers = [0, 150, 400, 1000, 2500].map((delay) => window.setTimeout(syncHeight, delay));
    const iframe = iframeRef.current;
    let observer;
    try {
      const doc = iframe?.contentDocument;
      const target = doc?.body || doc?.documentElement;
      if (target && typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(() => syncHeight());
        observer.observe(target);
      }
    } catch {
      observer = undefined;
    }
    window.addEventListener('resize', syncHeight);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      observer?.disconnect();
      window.removeEventListener('resize', syncHeight);
    };
  }, [iframeReady, htmlSrcDoc, syncHeight]);

  if (!newsletter?.fileUrl) return null;

  if (isPdf) {
    return (
      <NewsletterPdfViewer
        fileUrl={newsletter.fileUrl}
        title={newsletter.title}
        compact={Boolean(minHeight)}
        compactHeight={minHeight}
      />
    );
  }

  return (
    <Box sx={{ position: 'relative', bgcolor: 'common.white' }}>
      {loadingHtml || (!htmlSrcDoc && !iframeReady) ? (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 10 }}>
          <CircularProgress size={28} />
        </Stack>
      ) : null}

      {htmlSrcDoc ? (
        <Box
          component="iframe"
          ref={iframeRef}
          title={newsletter.title || 'Newsletter'}
          srcDoc={htmlSrcDoc}
          scrolling="no"
          onLoad={() => {
            setIframeReady(true);
            syncHeight();
          }}
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          sx={{
            display: 'block',
            width: 1,
            height: frameHeight ? `${frameHeight}px` : 150,
            minHeight: 0,
            border: 0,
            overflow: 'hidden',
            bgcolor: 'common.white',
          }}
        />
      ) : null}
    </Box>
  );
}
