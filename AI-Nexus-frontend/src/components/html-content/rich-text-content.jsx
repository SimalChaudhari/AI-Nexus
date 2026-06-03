import { useEffect, useMemo, useRef } from 'react';

import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';

import { Lightbox, useLightBox } from 'src/components/lightbox';
import { extractImageSrcsFromHtml, normalizeImageSrc } from 'src/utils/html-image-srcs';

import { ViewHtmlContent } from './view-html-content';

// ----------------------------------------------------------------------

/**
 * Reusable renderer for CKEditor/HTML content with optional line clamp.
 *
 * @param {boolean} [listPreview] — When true (e.g. forum list cards), floated editor images are
 *   stacked and size-capped so -webkit-line-clamp previews do not squash images or wrap text beside them.
 * @param {boolean} [clickableImages] — When true, images open in a lightbox on click (e.g. forum comments).
 */
export function RichTextContent({
  html,
  sx,
  className,
  clampLines,
  listPreview = false,
  clickableImages = false,
}) {
  const containerRef = useRef(null);

  const imageSlides = useMemo(() => {
    if (!clickableImages) return [];
    return extractImageSrcsFromHtml(html).map((src) => ({ src }));
  }, [clickableImages, html]);

  const lightbox = useLightBox(imageSlides);

  useEffect(() => {
    if (!clickableImages || !imageSlides.length) return undefined;

    const root = containerRef.current;
    if (!root) return undefined;

    const imgs = root.querySelectorAll('img[src]');
    const cleanups = [];

    imgs.forEach((img) => {
      const openImage = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const src = normalizeImageSrc(img.currentSrc || img.getAttribute('src') || img.src);
        if (!src) return;
        const index = imageSlides.findIndex((slide) => normalizeImageSrc(slide.src) === src);
        if (index >= 0) {
          lightbox.setSelected(index);
        } else {
          lightbox.onOpen(src);
        }
      };

      img.style.cursor = 'pointer';
      img.setAttribute('role', 'button');
      img.setAttribute('tabindex', '0');
      img.setAttribute('aria-label', 'View image');

      img.addEventListener('click', openImage);
      const onKeyDown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          openImage(event);
        }
      };
      img.addEventListener('keydown', onKeyDown);

      cleanups.push(() => {
        img.removeEventListener('click', openImage);
        img.removeEventListener('keydown', onKeyDown);
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, [clickableImages, html, imageSlides, lightbox.onOpen, lightbox.setSelected]);

  if (!html || typeof html !== 'string') return null;

  // Do not use -webkit-line-clamp here: display:-webkit-box breaks <ul>/<ol> markers in Chrome/WebKit.
  const clampInnerSx = clampLines
    ? {
        overflow: 'hidden',
        fontSize: '0.9375rem',
        lineHeight: 1.65,
        maxHeight: `${clampLines * 1.65}em`,
      }
    : {};

  const listPreviewSx = listPreview
    ? {
        // -webkit-box (line clamp) + floated images breaks layout; stack media like a feed card.
        '& img': {
          float: 'none !important',
          display: 'block',
          maxWidth: '100%',
          width: 'auto !important',
          height: 'auto',
          maxHeight: { xs: 160, sm: 200 },
          objectFit: 'contain',
          objectPosition: 'left center',
          my: 1,
          mx: 0,
          borderRadius: 1.5,
          border: (theme) => `1px solid ${theme.palette.divider}`,
          bgcolor: (theme) => alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.12 : 0.5),
        },
        '& figure': {
          float: 'none !important',
          display: 'block',
          maxWidth: '100%',
          my: 1,
          mx: 0,
        },
        '& figure img': {
          maxHeight: { xs: 160, sm: 200 },
          border: 'none',
          bgcolor: 'transparent',
        },
        '& ul, & ol': {
          clear: 'both',
          width: '100%',
          float: 'none',
          listStylePosition: 'outside',
          pl: '1.5rem !important',
          listStyleImage: 'none',
        },
        '& ul': { listStyleType: 'disc !important' },
        '& ol': { listStyleType: 'decimal !important' },
        '& ul > li, & ol > li': { display: 'list-item' },
      }
    : {};

  const clickableImageSx = clickableImages
    ? {
        '& img': {
          cursor: 'pointer',
          transition: (theme) => theme.transitions.create('opacity'),
          '&:hover': { opacity: 0.88 },
        },
      }
    : {};

  return (
    <>
      <Box
        ref={containerRef}
        className={className}
        sx={{
          '& p': { m: 0 },
          '& *': { maxWidth: '100%' },
          ...listPreviewSx,
          ...clickableImageSx,
        }}
      >
        <Box sx={clampInnerSx}>
          <ViewHtmlContent html={html} sx={sx} />
        </Box>
      </Box>

      {clickableImages && imageSlides.length > 0 ? (
        <Lightbox
          index={lightbox.selected}
          slides={imageSlides}
          open={lightbox.open}
          close={lightbox.onClose}
        />
      ) : null}
    </>
  );
}
