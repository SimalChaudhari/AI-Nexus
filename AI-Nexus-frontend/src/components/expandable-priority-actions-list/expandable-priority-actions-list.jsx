import { useState } from 'react';

import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const ROW_DIVIDER_SX = {
  borderColor: 'common.black',
  borderBottomWidth: 1.5,
  opacity: 0.2,
};

const ICON_SIZE = 32;
const ICON_GLYPH = 24;

// ----------------------------------------------------------------------

/** Expandable list for priority actions and readiness recommendations. */
export function ExpandablePriorityActionsList({ items = [], getLabel }) {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const visibleItems = (items || []).map((item) => String(item || '').trim()).filter(Boolean);

  if (!visibleItems.length) {
    return null;
  }

  const toggleExpand = (index) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  const resolveLabel = (text, index) =>
    typeof getLabel === 'function' ? getLabel(text, index) : text;

  return (
    <Box sx={{ overflowAnchor: 'none' }}>
      {visibleItems.map((text, index) => {
        const isExpanded = expandedIndex === index;
        const isLast = index === visibleItems.length - 1;
        const label = resolveLabel(text, index);

        return (
          <Box key={`priority-action-${index}-${text}`}>
            <Box sx={{ py: 2 }}>
              <Box
                role="button"
                tabIndex={0}
                onClick={() => toggleExpand(index)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleExpand(index);
                  }
                }}
                aria-expanded={isExpanded}
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 1.5,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <Box
                  component="span"
                  aria-hidden
                  sx={{
                    flexShrink: 0,
                    width: ICON_SIZE,
                    height: ICON_SIZE,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    bgcolor: 'grey.400',
                    color: 'common.black',
                    '@media (hover: hover)': {
                      '&:hover': { bgcolor: 'grey.500' },
                    },
                  }}
                >
                  <Iconify
                    icon={isExpanded ? 'eva:minus-fill' : 'eva:plus-fill'}
                    width={ICON_GLYPH}
                    sx={{ color: 'common.black', display: 'block' }}
                  />
                </Box>

                <Typography
                  component="span"
                  variant="subtitle1"
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    m: 0,
                    color: 'primary.main',
                    fontWeight: 500,
                    fontSize: '0.9375rem',
                    lineHeight: `${ICON_SIZE}px`,
                  }}
                >
                  {label}
                </Typography>
              </Box>

              <Collapse in={isExpanded} timeout={220} unmountOnExit={false}>
                <Box
                  sx={{
                    pl: `calc(${ICON_SIZE}px + 12px)`,
                    pt: 0.75,
                    pb: 0.25,
                  }}
                >
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.65 }}>
                    {text}
                  </Typography>
                </Box>
              </Collapse>
            </Box>

            {!isLast ? <Divider sx={ROW_DIVIDER_SX} /> : null}
          </Box>
        );
      })}
    </Box>
  );
}
