import { useState } from 'react';

import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { Iconify } from 'src/components/iconify';
import { ViewHtmlContent } from 'src/components/html-content/view-html-content';

// ----------------------------------------------------------------------

const FAQ_DIVIDER_SX = {
  borderColor: 'common.black',
  borderBottomWidth: 1.5,
  opacity: 0.2,
};

export function FaqsList({ items = [] }) {
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
          <Box key={`faq-${index}-${item.question}`}>
            <Box sx={{ pt: 2, pb: isExpanded ? 1 : 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <IconButton
                  onClick={() => toggleExpand(index)}
                  aria-label={isExpanded ? 'Hide answer' : 'Show answer'}
                  sx={{
                    flexShrink: 0,
                    p: 0.5,
                    width: 32,
                    height: 32,
                    color: 'common.black',
                    bgcolor: 'grey.400',
                    borderRadius: '50%',
                    '&:hover': {
                      bgcolor: 'grey.500',
                    },
                  }}
                >
                  <Iconify
                    icon={isExpanded ? 'eva:minus-fill' : 'eva:plus-fill'}
                    width={24}
                    sx={{ color: 'common.black' }}
                  />
                </IconButton>

                <Typography
                  variant="subtitle1"
                  onClick={() => toggleExpand(index)}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    color: 'primary.main',
                    fontWeight: 500,
                    lineHeight: 1.45,
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  {item.question}
                </Typography>
              </Box>

              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <Box sx={{ pl: 'calc(36px + 12px)', pt: 0.75, pb: 0.25 }}>
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
