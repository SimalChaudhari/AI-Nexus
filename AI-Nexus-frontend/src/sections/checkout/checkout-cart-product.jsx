import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { RichTextContent } from 'src/components/html-content';

// ----------------------------------------------------------------------

function toDisplayText(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object' && value !== null) {
    return value.title ?? value.label ?? value.name ?? '';
  }
  return String(value);
}

export function CheckoutCartProduct({ row, onDelete, deleting = false }) {
  const displayName = toDisplayText(row.name);
  const priceTotal = Number(row.price) || 0;
  const itemDetailsPath = paths.learningCourse.details(row.id);
  const description =
    toDisplayText(row.description) ||
    toDisplayText(row.subDescription) ||
    toDisplayText(row.shortDescription) ||
    'Digital course access';
  const displayLevel = toDisplayText(row.level);
  const modulesCount = Number(row.modulesCount ?? row.moduleCount ?? 0);
  const sectionsCount = Number(row.sectionsCount ?? row.sectionCount ?? 0);
  const deliveryMode = toDisplayText(row.deliveryMode || row.mode);
  const cpeHours = Number(row.cpeHours ?? 0);
  const lessonCount = Number(row.lessonCount ?? 0);

  return (
    <Card
      sx={{
        p: { xs: 1.25, md: 1.5 },
        borderRadius: 1.75,
        border: (theme) => `1px solid ${theme.palette.divider}`,
        boxShadow: 'none',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr auto', md: '220px minmax(0,1fr) 110px' },
          gap: { xs: 1.25, md: 1.5 },
          alignItems: 'flex-start',
        }}
      >
        <Stack
          direction="row"
          spacing={1.25}
          alignItems="flex-start"
          sx={{ minWidth: 0, gridColumn: { xs: '1 / 2', md: 'auto' } }}
        >
          <Box
            component={RouterLink}
            href={itemDetailsPath}
            sx={{ display: 'inline-flex', borderRadius: 1.25, textDecoration: 'none', flexShrink: 0 }}
          >
            <Avatar
              variant="rounded"
              alt={displayName}
              src={row.coverUrl}
              sx={{ width: { xs: 66, md: 78 }, height: { xs: 66, md: 78 }, cursor: 'pointer' }}
            />
          </Box>

          <Stack spacing={0.55} sx={{ minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              component={RouterLink}
              href={itemDetailsPath}
              sx={{
                color: 'text.primary',
                textDecoration: 'none',
                fontWeight: 700,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {displayName}
            </Typography>
            <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700 }}>
              In stock
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Instant delivery after payment
            </Typography>
          </Stack>
        </Stack>

        <Stack spacing={0.75} sx={{ minWidth: 0, gridColumn: { xs: '1 / -1', md: 'auto' } }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography
              variant="subtitle2"
              component={RouterLink}
              href={itemDetailsPath}
              sx={{
                color: 'text.primary',
                textDecoration: 'none',
                fontWeight: 700,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              Details
            </Typography>
            {(modulesCount > 0 || sectionsCount > 0) && (
              <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700 }}>
                {modulesCount > 0 ? `${modulesCount} Modules` : ''}
                {modulesCount > 0 && sectionsCount > 0 ? ' • ' : ''}
                {sectionsCount > 0 ? `${sectionsCount} Sections` : ''}
              </Typography>
            )}
          </Stack>
          <RichTextContent
            html={description}
            clampLines={undefined}
            sx={{
              typography: 'caption',
              color: 'text.secondary',
              '& p': { m: 0 },
              '& ul, & ol': {
                my: 0.1,
                pl: 2.25,
                display: { xs: 'block', lg: 'grid' },
                gridAutoFlow: 'column',
                gridTemplateRows: 'repeat(5, auto)',
                gridAutoColumns: 'minmax(0, 1fr)',
                columnGap: 2.5,
              },
              '& li': { my: 0.1, color: 'text.secondary', wordBreak: 'normal', overflowWrap: 'break-word' },
              '& ul li::marker, & ol li::marker': { color: 'primary.main' },
              '& h1, & h2, & h3, & h4, & h5, & h6': {
                m: 0,
                fontSize: 'inherit',
                fontWeight: 600,
              },
            }}
          />
        </Stack>

        <Stack
          alignItems={{ xs: 'flex-end', md: 'flex-end' }}
          spacing={0.35}
          sx={{
            minWidth: { xs: 90, md: 90 },
            gridColumn: { xs: '2 / 3', md: 'auto' },
            gridRow: { xs: '1 / 2', md: 'auto' },
          }}
        >
          <IconButton
            size="medium"
            color="error"
            onClick={onDelete}
            disabled={deleting}
            aria-label="Delete item"
            sx={{
              width: 34,
              height: 34,
              bgcolor: 'error.lighter',
              border: (theme) => `1px solid ${theme.palette.error.light}`,
              '&:hover': { bgcolor: 'error.light' },
            }}
          >
            {deleting ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <Iconify icon="solar:trash-bin-trash-bold" width={20} />
            )}
          </IconButton>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Price
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main', lineHeight: 1.2 }}>
            {fCurrency(priceTotal)}
          </Typography>
        </Stack>
      </Box>
      <Divider sx={{ mt: 1.25, borderStyle: 'dashed', opacity: 0.6 }} />
    </Card>
  );
}
