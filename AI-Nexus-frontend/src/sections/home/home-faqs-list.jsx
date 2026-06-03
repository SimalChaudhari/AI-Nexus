import { useState } from 'react';

import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';
import { ViewHtmlContent } from 'src/components/html-content/view-html-content';

// ----------------------------------------------------------------------

const FAQ_DIVIDER_SX = {
  borderColor: 'common.black',
  borderBottomWidth: 1.5,
  opacity: 0.2,
};

const ICON_SIZE = 32;
const ICON_GLYPH = 24;

// ----------------------------------------------------------------------

export function HomeFaqsList({ items = [] }) {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const visibleItems = (items || []).filter((item) => String(item?.question || '').trim());

  if (!visibleItems.length) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        No FAQs have been published yet.
      </Typography>
    );
  }

  const toggleExpand = (index) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  return (
    <Box>
      {visibleItems.map((item, index) => {
        const isExpanded = expandedIndex === index;
        const answer = String(item?.answer || '').trim();
        const isLast = index === visibleItems.length - 1;

        return (
          <Box key={`faq-${index}-${item.question}`} sx={{ overflowAnchor: 'none' }}>
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
                    transition: (theme) =>
                      theme.transitions.create('background-color', { duration: 150 }),
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
                  {item.question}
                </Typography>
              </Box>

              <Collapse in={isExpanded} timeout={220} unmountOnExit={false}>
                <Box
                  sx={{
                    pl: `calc(${ICON_SIZE}px + 12px)`,
                    pt: 0.75,
                    pb: 0.25,
                    overflow: 'hidden',
                  }}
                >
                  {answer ? (
                    <ViewHtmlContent
                      html={answer}
                      sx={{
                        '& p': { mb: 0.5, mt: 0 },
                        '& p:first-of-type': { mt: 0 },
                        '& p:last-child': { mb: 0 },
                        '& > *:first-of-type': { mt: '0 !important' },
                      }}
                    />
                  ) : (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      No answer available.
                    </Typography>
                  )}
                </Box>
              </Collapse>
            </Box>

            {!isLast ? <Divider sx={FAQ_DIVIDER_SX} /> : null}
          </Box>
        );
      })}
    </Box>
  );
}
