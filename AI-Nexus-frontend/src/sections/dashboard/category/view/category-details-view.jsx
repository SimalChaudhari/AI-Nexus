import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { Iconify } from 'src/components/iconify';
import { EntityDetailsLayout } from 'src/components/entity-details-layout';

// ----------------------------------------------------------------------

export function CategoryDetailsView({ category, loading, error }) {
  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !category) {
    return (
      <DashboardContent sx={{ pt: 5 }}>
        <EmptyContent
          filled
          title="Category not found!"
          action={
            <Button
              component={RouterLink}
              href={paths.admin.category.list}
              startIcon={<Iconify width={16} icon="eva:arrow-ios-back-fill" />}
              sx={{ mt: 3 }}
            >
              Back to list
            </Button>
          }
          sx={{ py: 10, height: 'auto', flexGrow: 'unset' }}
        />
      </DashboardContent>
    );
  }

  const statusLabel = category.status || 'active';
  const statusColor = statusLabel === 'active' ? 'success' : 'default';

  const initials =
    category.title
      ?.split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';

  const headerChips = [
    {
      label: statusLabel,
      color: statusColor,
    },
    category.icon && { label: 'Icon', icon: category.icon, variant: 'soft' },
  ].filter(Boolean);

  const sections = [
    {
      title: 'Category Information',
      icon: 'solar:category-2-bold',
      rows: [
        {
          label: 'Title',
          value: category.title || '-',
        },
        {
          label: 'Slug',
          value: (
            <Box component="code" sx={{ typography: 'body2', wordBreak: 'break-all' }}>
              {category.slug || '-'}
            </Box>
          ),
        },
        {
          label: 'Description',
          value: category.description?.trim() ? category.description : '-',
        },
        {
          label: 'Image',
          value: (() => {
            const img = String(category.image || '').trim();
            if (!img) return '-';
            if (/^https?:\/\//.test(img) || img.startsWith('/')) {
              return (
                <Box
                  component="img"
                  alt=""
                  src={img}
                  sx={{ maxWidth: 240, maxHeight: 140, borderRadius: 1, objectFit: 'cover' }}
                />
              );
            }
            return img;
          })(),
        },
        {
          label: 'Icon',
          value: category.icon ? (
            <>
              <Iconify icon={category.icon} width={20} />
              &nbsp;{category.icon}
            </>
          ) : (
            '-'
          ),
        },
        {
          label: 'Status',
          value: (
            <Chip
              label={statusLabel}
              color={statusColor}
              size="small"
              sx={{ mt: 0.5, fontWeight: 600, textTransform: 'capitalize' }}
            />
          ),
        },
      ],
    },
    {
      title: 'Meta',
      icon: 'solar:clock-circle-bold',
      rows: [
        {
          label: 'Created At',
          value: category.createdAt ? new Date(category.createdAt).toLocaleString() : '-',
        },
        {
          label: 'Updated At',
          value: category.updatedAt ? new Date(category.updatedAt).toLocaleString() : '-',
        },
      ],
    },
  ];

  return (
    <EntityDetailsLayout
      heading="Category Details"
      links={[
        { name: 'Dashboard', href: paths.dashboard.root },
        { name: 'Course', href: paths.admin.course.list },
        { name: 'Category', href: paths.admin.category.list },
        { name: category?.title },
      ]}
      editHref={paths.admin.category.edit(category?.id)}
      header={{
        backgroundImage: '/assets/profilebg.jpg',
        avatarText: initials,
        title: category.title || '-',
        chips: headerChips,
      }}
      sections={sections}
    />
  );
}

