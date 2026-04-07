import { useState, useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

import { Iconify } from 'src/components/iconify';

export function LessonDocumentViewer({
  lesson,
  lessonId,
  locked,
  viewedSectionIds,
  setViewedSectionIds,
  frameHeight = { xs: 260, sm: 320, md: 580 },
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const openedMapRef = useRef({});

  const attachments = Array.isArray(lesson?.attachments) ? lesson.attachments : [];
  const hasAttachments = attachments.length > 0;
  const currentIndex =
    hasAttachments && activeIndex >= 0 && activeIndex < attachments.length ? activeIndex : 0;
  const currentUrl = hasAttachments ? attachments[currentIndex] : null;
  const normalizedUrl = currentUrl ? currentUrl.split('#')[0].split('?')[0].toLowerCase() : '';
  const isPdf = normalizedUrl.endsWith('.pdf');

  const markViewedIfAllOpened = useCallback(
    (sectionId) => {
      const att = attachments;
      const opened = openedMapRef.current[sectionId];
      if (!att.length || !opened || opened.size < att.length) return;
      setViewedSectionIds((prev) => {
        if (prev.includes(sectionId)) return prev;
        const next = [...prev, sectionId];
        return next;
      });
    },
    [attachments, setViewedSectionIds],
  );

  if (!hasAttachments) return null;

  const isViewed = viewedSectionIds.includes(lessonId);

  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        sx={{
          bgcolor: 'background.paper',
          boxShadow: (theme) => theme.customShadows.z8,
          overflow: 'hidden',
          border: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box
          sx={{
            position: 'relative',
            bgcolor: 'grey.100',
            width: '100%',
            height: frameHeight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {currentUrl ? (
            isPdf ? (
              <Box
                component="iframe"
                src={currentUrl}
                title="Document viewer"
                sx={{
                  width: '100%',
                  height: '100%',
                  border: 0,
                  display: 'block',
                }}
                onLoad={() => {
                  const id = lessonId;
                  if (!id) return;
                  const map = openedMapRef.current;
                  const set = map[id] instanceof Set ? map[id] : new Set();
                  set.add(currentUrl);
                  map[id] = set;
                  openedMapRef.current = map;
                  markViewedIfAllOpened(id);
                }}
              />
            ) : (
              <Box
                sx={{
                  p: 2,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                }}
              >
                <Iconify
                  icon="solar:document-bold"
                  width={40}
                  sx={{ color: 'text.secondary', mb: 1.5 }}
                />
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                  Your browser may not preview this file inline. Click below to open it in a new tab.
                </Typography>
                <Button
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="contained"
                  size="small"
                  startIcon={<Iconify icon="eva:external-link-outline" width={16} />}
                  onClick={() => {
                    const id = lessonId;
                    if (!id) return;
                    const map = openedMapRef.current;
                    const set = map[id] instanceof Set ? map[id] : new Set();
                    set.add(currentUrl);
                    map[id] = set;
                    openedMapRef.current = map;
                    markViewedIfAllOpened(id);
                  }}
                >
                  Open file
                </Button>
              </Box>
            )
          ) : (
            <Box
              sx={{
                p: 2,
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Document not available.
              </Typography>
            </Box>
          )}
          {locked && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
                px: 2,
                bgcolor: (theme) => theme.palette.grey[900] + 'b8',
              }}
            >
              <Iconify icon="solar:lock-keyhole-bold" width={40} sx={{ color: 'common.white' }} />
              <Typography
                variant="subtitle2"
                sx={{ color: 'common.white', fontWeight: 600, textAlign: 'center' }}
              >
                Complete the previous lesson to unlock this content
              </Typography>
            </Box>
          )}
        </Box>

        {attachments.length > 1 && (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
            sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}
          >
            <Button
              size="small"
              variant="outlined"
              startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
              onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex <= 0}
            >
              Previous
            </Button>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              {currentIndex + 1} / {attachments.length}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}
              onClick={() => setActiveIndex((i) => Math.min(attachments.length - 1, i + 1))}
              disabled={currentIndex >= attachments.length - 1}
            >
              Next
            </Button>
          </Stack>
        )}

      </Box>
    </Box>
  );
}

