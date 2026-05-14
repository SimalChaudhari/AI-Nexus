import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

import { resolveFlowisePublicBaseUrl } from 'src/utils/flowise-public-url';
import { encodeFlowDataForHash } from 'src/utils/encode-flowise-preview-hash';
import { WorkflowFlowMiniPreview } from 'src/components/workflow-flow-mini-preview/workflow-flow-mini-preview';

const PREVIEW_PATH = '/embed/marketplace-preview';

/**
 * Full Flowise React Flow canvas in a card via lazy iframe (`/embed/marketplace-preview`).
 * Mini sketch shows until the iframe is in view and has finished loading.
 */
export function WorkflowFlowiseCardIframe({ flowData, title = 'Flow preview' }) {
  const rootRef = useRef(null);
  const iframeRef = useRef(null);
  const [mountIframe, setMountIframe] = useState(false);
  const [frameReady, setFrameReady] = useState(false);

  const flowiseBase = resolveFlowisePublicBaseUrl();
  const hashPayload = useMemo(
    () => (flowData?.nodes?.length ? encodeFlowDataForHash(flowData) : ''),
    [flowData]
  );

  const iframeSrc = useMemo(() => {
    if (!flowiseBase || !hashPayload) return '';
    const base = flowiseBase.replace(/\/$/, '');
    return `${base}${PREVIEW_PATH}#flowData=${encodeURIComponent(hashPayload)}`;
  }, [flowiseBase, hashPayload]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || !iframeSrc) return undefined;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setMountIframe(true);
      },
      { rootMargin: '120px', threshold: 0.02 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [iframeSrc]);

  const pushFlowToFrame = useCallback(() => {
    if (!flowData) return;
    try {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'AINEXUS_FLOW_PREVIEW',
          flowData,
        },
        '*'
      );
    } catch {
      // not ready
    }
  }, [flowData]);

  const handleIframeLoad = useCallback(() => {
    pushFlowToFrame();
    setFrameReady(true);
  }, [pushFlowToFrame]);

  if (!iframeSrc) {
    return (
      <Box sx={{ position: 'absolute', inset: 0 }}>
        <WorkflowFlowMiniPreview nodes={flowData?.nodes} edges={flowData?.edges} />
      </Box>
    );
  }

  return (
    <Box ref={rootRef} sx={{ position: 'absolute', inset: 0, bgcolor: '#fff', overflow: 'hidden' }}>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          opacity: frameReady ? 0 : 1,
          transition: 'opacity 0.35s ease-out',
          pointerEvents: 'none',
        }}
      >
        <WorkflowFlowMiniPreview nodes={flowData?.nodes} edges={flowData?.edges} />
      </Box>

      {mountIframe ? (
        <iframe
          ref={iframeRef}
          title={title}
          src={iframeSrc}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            border: 'none',
            zIndex: 1,
            opacity: frameReady ? 1 : 0,
            transition: 'opacity 0.35s ease-out',
            pointerEvents: 'none',
            background: '#fff',
          }}
          onLoad={handleIframeLoad}
        />
      ) : null}

      {mountIframe && !frameReady ? (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255,255,255,0.4)',
            pointerEvents: 'none',
          }}
        >
          <CircularProgress size={28} thickness={4} />
        </Box>
      ) : null}
    </Box>
  );
}
