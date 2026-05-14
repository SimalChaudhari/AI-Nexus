import Box from '@mui/material/Box';
import { useId } from 'react';

// ----------------------------------------------------------------------

const DEFAULT_W = 240;
const DEFAULT_H = 88;
const STRIPE_W = 42;

const getNodeRect = (node) => {
  const x = Number(node?.position?.x) || 0;
  const y = Number(node?.position?.y) || 0;
  const w = typeof node?.width === 'number' && node.width > 0 ? node.width : DEFAULT_W;
  const h = typeof node?.height === 'number' && node.height > 0 ? node.height : DEFAULT_H;
  return { x, y, w, h, id: String(node?.id || '') };
};

const centerOf = (r) => ({
  cx: r.x + r.w / 2,
  cy: r.y + r.h / 2,
});

const truncate = (s, max = 28) => {
  const t = String(s || '').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
};

const isStickyNoteNode = (node) => {
  const name = String(node?.data?.name || '');
  const type = String(node?.type || '');
  return (
    name === 'stickyNoteAgentflow' ||
    name.includes('stickyNote') ||
    type.includes('sticky')
  );
};

/** Best-effort: Flowise stores model under *ModelConfig on inputs or data. */
const extractModelSubtitle = (data) => {
  if (!data || typeof data !== 'object') return '';
  const inputs = data.inputs;
  if (inputs && typeof inputs === 'object') {
    for (const v of Object.values(inputs)) {
      if (v && typeof v === 'object' && typeof v.modelName === 'string' && v.modelName.trim()) {
        return v.modelName.trim();
      }
    }
  }
  for (const [k, v] of Object.entries(data)) {
    if (k.endsWith('ModelConfig') && v && typeof v === 'object' && typeof v.modelName === 'string' && v.modelName.trim()) {
      return v.modelName.trim();
    }
  }
  if (typeof data.modelName === 'string' && data.modelName.trim()) return data.modelName.trim();
  return '';
};

/**
 * True when we should draw a lightweight diagram instead of a generic Flowise logo / empty state.
 */
export function shouldRenderWorkflowMiniPreview(imageUrl, flowData) {
  const nodes = flowData?.nodes;
  if (!Array.isArray(nodes) || nodes.length === 0) return false;
  if (!imageUrl || typeof imageUrl !== 'string') return true;
  const u = imageUrl.toLowerCase();
  if (u.includes('flowise_dark.svg') || u.includes('flowise_white.svg')) return true;
  if (u.includes('raw.githubusercontent.com/flowiseai/flowise') && u.includes('.svg')) return true;
  return false;
}

/**
 * Flowise-inspired structural preview (grid, cards, model line). Not the real Flowise bundle.
 */
export function WorkflowFlowMiniPreview({ nodes = [], edges = [], sx }) {
  const gridPatternId = useId().replace(/:/g, '_');
  const limited = (Array.isArray(nodes) ? nodes : []).slice(0, 48);
  if (!limited.length) return null;

  const rects = limited.map((n) => ({ ...getNodeRect(n), node: n }));
  const idSet = new Set(rects.map((r) => r.id).filter(Boolean));

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  rects.forEach((r) => {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  });

  const pad = 28;
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;
  const vbW = Math.max(maxX - minX, 120);
  const vbH = Math.max(maxY - minY, 80);

  const byId = new Map(rects.map((r) => [r.id, r]));

  const lineEdges = (Array.isArray(edges) ? edges : []).filter(
    (e) => idSet.has(String(e?.source)) && idSet.has(String(e?.target))
  );

  const accent = (node) => String(node?.data?.color || '#64748b');

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        bgcolor: '#f3f4f8',
        pointerEvents: 'none',
        ...sx,
      }}
    >
      <Box
        component="svg"
        viewBox={`${minX} ${minY} ${vbW} ${vbH}`}
        preserveAspectRatio="xMidYMid meet"
        sx={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      >
        <defs>
          <pattern id={gridPatternId} width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.15" fill="#b8c0d0" opacity="0.38" />
          </pattern>
        </defs>
        <rect x={minX} y={minY} width={vbW} height={vbH} fill={`url(#${gridPatternId})`} />

        {lineEdges.map((edge) => {
          const a = byId.get(String(edge.source));
          const b = byId.get(String(edge.target));
          if (!a || !b) return null;
          const p1 = centerOf(a);
          const p2 = centerOf(b);
          const stroke = edge?.data?.sourceColor || edge?.data?.targetColor || 'rgba(100,116,139,0.55)';
          const mx = (p1.cx + p2.cx) / 2;
          const d = `M ${p1.cx} ${p1.cy} C ${mx} ${p1.cy}, ${mx} ${p2.cy}, ${p2.cx} ${p2.cy}`;
          const label = edge?.data?.edgeLabel;
          const lx = (p1.cx + p2.cx) / 2;
          const ly = (p1.cy + p2.cy) / 2 - 4;
          return (
            <g key={String(edge.id || `${edge.source}-${edge.target}`)}>
              <path d={d} fill="none" stroke={stroke} strokeWidth={2} opacity={0.9} />
              {label !== undefined && label !== null && String(label).length > 0 ? (
                <g>
                  <rect
                    x={lx - 10}
                    y={ly - 9}
                    width={20}
                    height={16}
                    rx={4}
                    fill="rgba(255,255,255,0.95)"
                    stroke="rgba(148,163,184,0.9)"
                    strokeWidth={0.75}
                  />
                  <text
                    x={lx}
                    y={ly + 3}
                    textAnchor="middle"
                    fill="#334155"
                    fontSize={10}
                    fontWeight={700}
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    {String(label)}
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}

        {rects.map((r) => {
          const node = r.node;
          const label = truncate(node?.data?.label || node?.data?.name || node?.type || 'Step', 32);
          const sub = extractModelSubtitle(node?.data || {});
          const sticky = isStickyNoteNode(node);
          const rx = 12;

          if (sticky) {
            return (
              <g key={r.id || `${r.x}-${r.y}`}>
                <rect
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  rx={8}
                  fill="#fff9c4"
                  stroke="#e6d98c"
                  strokeWidth={1}
                  opacity={0.98}
                />
                <text
                  x={r.x + 10}
                  y={r.y + 22}
                  fill="#5c4d00"
                  fontSize={Math.min(11, r.h * 0.2)}
                  fontWeight={500}
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {truncate(label, 40)}
                </text>
              </g>
            );
          }

          const stripe = Math.min(STRIPE_W, Math.max(32, r.w * 0.2));
          const titleY = r.y + Math.min(28, r.h * 0.32);
          const subY = r.y + Math.min(48, r.h * 0.58);
          const innerPad = 3;

          return (
            <g key={r.id || `${r.x}-${r.y}`}>
              <rect
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                rx={rx}
                fill="#ffffff"
                stroke="#d1d5db"
                strokeWidth={1}
              />
              <rect
                x={r.x + innerPad}
                y={r.y + innerPad}
                width={Math.max(stripe - innerPad, 24)}
                height={r.h - innerPad * 2}
                rx={6}
                fill={accent(node)}
              />
              <text
                x={r.x + stripe + 8}
                y={titleY}
                fill="#0f172a"
                fontSize={Math.min(14, r.h * 0.26)}
                fontWeight={600}
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {label}
              </text>
              {sub ? (
                <text
                  x={r.x + stripe + 8}
                  y={subY}
                  fill="#64748b"
                  fontSize={Math.min(11, r.h * 0.2)}
                  fontWeight={500}
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {truncate(sub, 36)}
                </text>
              ) : null}
            </g>
          );
        })}
      </Box>
    </Box>
  );
}
