import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { Iconify } from 'src/components/iconify';
import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

export function ProductDetailsView({ product, loading, error }) {
  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !product) {
    return (
      <DashboardContent sx={{ pt: 5 }}>
        <EmptyContent
          filled
          title="Product not found!"
          action={
            <Button
              component={RouterLink}
              href={paths.admin.product.list}
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

  const images = product.images || [];
  const categories = product.categories || [];

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Product Details"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Product', href: paths.admin.product.list },
          { name: product?.title },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.admin.product.edit(product?.id)}
            variant="contained"
            startIcon={<Iconify icon="solar:pen-bold" />}
          >
            Edit
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Grid container spacing={3}>
        <Grid xs={12} md={4}>
          <Card sx={{ p: 3 }}>
            {images.length > 0 ? (
              <Box
                component="img"
                src={typeof images[0] === 'object' ? images[0].image : images[0]}
                alt={product.title}
                sx={{
                  width: '100%',
                  maxHeight: 300,
                  objectFit: 'contain',
                  borderRadius: 1,
                  mb: 2,
                }}
              />
            ) : (
              <Box
                sx={{
                  width: '100%',
                  height: 200,
                  bgcolor: 'grey.200',
                  borderRadius: 1,
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  No Image
                </Typography>
              </Box>
            )}

            <Typography variant="h6" sx={{ mb: 1 }}>
              {product.title}
            </Typography>

            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Label color={product.inStock ? 'success' : 'error'} variant="soft">
                {product.inStock ? 'In Stock' : 'Out of Stock'}
              </Label>
              {product.isSale && <Label color="warning" variant="soft">On Sale</Label>}
            </Stack>
          </Card>
        </Grid>

        <Grid xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Product Information
            </Typography>

            <Box
              rowGap={3}
              columnGap={2}
              display="grid"
              gridTemplateColumns={{
                xs: 'repeat(1, 1fr)',
                sm: 'repeat(2, 1fr)',
              }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Title
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {product.title || '-'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Actual Price
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  ₹{product.actualPrice || 0}
                </Typography>
              </Box>

              {product.discountPrice && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Discount Price
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    ₹{product.discountPrice}
                  </Typography>
                </Box>
              )}

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Description
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {product.description || '-'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Categories
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {categories.length > 0 ? (
                    categories.map((cat) => (
                      <Chip
                        key={typeof cat === 'object' ? cat._id || cat.id : cat}
                        label={typeof cat === 'object' ? cat.title : cat}
                        size="small"
                      />
                    ))
                  ) : (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      No categories
                    </Typography>
                  )}
                </Stack>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Created At
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {product.createdAt ? new Date(product.createdAt).toLocaleString() : '-'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Updated At
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {product.updatedAt ? new Date(product.updatedAt).toLocaleString() : '-'}
                </Typography>
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
