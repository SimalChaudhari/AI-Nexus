import { useState, useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import {
  getLessonMediaFrameInnerSx,
  getLessonMediaFrameSx,
  LESSON_MEDIA_FRAME_HEIGHT,
} from 'src/sections/learning/utils/player-responsive-type';

export function LessonDocumentViewer({
  lesson,
  lessonId,
  lockedOverlay,
  viewedSectionIds,
  setViewedSectionIds,
  frameHeight = LESSON_MEDIA_FRAME_HEIGHT,
}) {
  const theme = useTheme();
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

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={getLessonMediaFrameSx(theme, frameHeight)}>
        <Box sx={getLessonMediaFrameInnerSx()}>
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
                  bgcolor: 'background.paper',
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
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  bgcolor: 'background.paper',
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
            <Typography variant="body2" sx={{ color: 'grey.400' }}>
              Document not available.
            </Typography>
          )}
        </Box>
        {lockedOverlay}
      </Box>

      {attachments.length > 1 && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{
            p: 1.5,
            bgcolor: 'background.paper',
            border: (t) => `1px solid ${t.palette.divider}`,
            borderTop: 0,
          }}
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
  );
}
