import { z as zod } from 'zod';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';
import { Upload } from 'src/components/upload';
import { createProduct, updateProduct } from 'src/store/slices/productSlice';
import { fetchCategories } from 'src/store/slices/categorySlice';

// ----------------------------------------------------------------------

export const NewProductSchema = zod.object({
  title: zod.string().min(1, { message: 'Title is required!' }),
  description: zod.string().min(1, { message: 'Description is required!' }),
  actualPrice: zod.number().min(0, { message: 'Actual price must be greater than or equal to 0' }),
  discountPrice: zod.number().optional(),
  isSale: zod.boolean().default(false),
  inStock: zod.boolean().default(true),
  categories: zod.array(zod.string()).min(1, { message: 'At least one category is required' }),
});

// ----------------------------------------------------------------------

export function ProductNewEditForm({ currentProduct }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const { categories } = useSelector((state) => state.categories);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);

  // Fetch categories on mount
  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const defaultValues = useMemo(
    () => ({
      title: currentProduct?.title || '',
      description: currentProduct?.description || '',
      actualPrice: currentProduct?.actualPrice || 0,
      discountPrice: currentProduct?.discountPrice || undefined,
      isSale: currentProduct?.isSale ?? false,
      inStock: currentProduct?.inStock ?? true,
      categories: currentProduct?.categories?.map((cat) => (typeof cat === 'object' ? cat._id || cat.id : cat)) || [],
    }),
    [currentProduct]
  );

  const methods = useForm({
    mode: 'onSubmit',
    resolver: zodResolver(NewProductSchema),
    defaultValues,
  });

  const {
    reset,
    setValue,
    watch,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  // Reset form and preview when currentProduct changes
  useEffect(() => {
    if (currentProduct?.id) {
      reset({
        title: currentProduct.title || '',
        description: currentProduct.description || '',
        actualPrice: currentProduct.actualPrice || 0,
        discountPrice: currentProduct.discountPrice || undefined,
        isSale: currentProduct.isSale ?? false,
        inStock: currentProduct.inStock ?? true,
        categories: currentProduct.categories?.map((cat) => (typeof cat === 'object' ? cat._id || cat.id : cat)) || [],
      });
      // Set preview images from existing product images
      if (currentProduct.images && currentProduct.images.length > 0) {
        setPreviewImages(currentProduct.images.map((img) => (typeof img === 'object' ? img.image : img)));
      } else {
        setPreviewImages([]);
      }
      setSelectedFiles([]);
    } else {
      reset({
        title: '',
        description: '',
        actualPrice: 0,
        discountPrice: undefined,
        isSale: false,
        inStock: true,
        categories: [],
      });
      setPreviewImages([]);
      setSelectedFiles([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProduct?.id, reset]);

  // Handle multiple files drop from Upload component
  const handleDrop = useCallback(
    (acceptedFiles) => {
      const newFiles = acceptedFiles.filter((file) => {
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`Image ${file.name} size should be less than 5MB`);
          return false;
        }
        return true;
      });

      if (newFiles.length === 0) return;

      setSelectedFiles((prev) => [...prev, ...newFiles]);
      setValue('images', 'files-selected', { shouldValidate: true });
    },
    [setValue]
  );

  // Handle file remove
  const handleRemove = useCallback((file) => {
    // Check if it's a File object (new file) or a string (existing image)
    if (file instanceof File) {
      setSelectedFiles((prev) => prev.filter((f) => f !== file));
    } else {
      // It's an existing image (base64 string), remove from preview only
      setPreviewImages((prev) => prev.filter((img) => img !== file));
    }
  }, []);

  // Handle remove all
  const handleRemoveAll = useCallback(() => {
    setSelectedFiles([]);
    setPreviewImages([]);
    setValue('images', '', { shouldValidate: true });
  }, [setValue]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      // Create FormData to send files
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description);
      formData.append('actualPrice', data.actualPrice.toString());
      if (data.discountPrice !== undefined && data.discountPrice !== null) {
        formData.append('discountPrice', data.discountPrice.toString());
      }
      formData.append('isSale', data.isSale.toString());
      formData.append('inStock', data.inStock.toString());
      formData.append('categories', JSON.stringify(data.categories));

      // Append new image files
      selectedFiles.forEach((file) => {
        formData.append('images', file);
      });

      if (currentProduct) {
        await dispatch(updateProduct({ id: currentProduct.id, productData: formData })).unwrap();
        toast.success('Product updated successfully!');
      } else {
        if (selectedFiles.length === 0) {
          toast.error('Please select at least one image');
          return;
        }
        await dispatch(createProduct(formData)).unwrap();
        toast.success('Product created successfully!');
      }
      router.push(paths.admin.product.list);
    } catch (error) {
      const errorMessage = error || 'Failed to save product';
      toast.error(errorMessage);
      console.error('Error saving product:', error);
    }
  });

  const values = watch();

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Field.Text name="title" label="Title" />

              <Field.Text name="description" label="Description" multiline rows={4} />

              <Stack direction="row" spacing={2}>
                <Field.Text name="actualPrice" label="Actual Price" type="number" />
                <Field.Text name="discountPrice" label="Discount Price (Optional)" type="number" />
              </Stack>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  Categories
                </Typography>
                <Controller
                  name="categories"
                  control={methods.control}
                  render={({ field, fieldState: { error } }) => (
                    <Field.Select
                      {...field}
                      multiple
                      label="Select Categories"
                      placeholder="Select categories"
                      error={!!error}
                      helperText={error?.message}
                    >
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.title}
                        </option>
                      ))}
                    </Field.Select>
                  )}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  Images
                </Typography>
                <Upload
                  multiple
                  value={selectedFiles.length > 0 || previewImages.length > 0 ? [...selectedFiles, ...previewImages] : null}
                  onDrop={handleDrop}
                  onRemove={handleRemove}
                  onRemoveAll={handleRemoveAll}
                  maxSize={5 * 1024 * 1024} // 5MB
                  accept={{
                    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
                  }}
                  thumbnail
                />
              </Box>
            </Stack>
          </Card>
        </Grid>

        <Grid xs={12} md={4}>
          <Stack spacing={3}>
            <Card sx={{ p: 3 }}>
              <Stack spacing={3}>
                <FormControlLabel
                  control={
                    <Controller
                      name="isSale"
                      control={methods.control}
                      render={({ field }) => <Switch {...field} checked={field.value} />}
                    />
                  }
                  label="On Sale"
                />

                <FormControlLabel
                  control={
                    <Controller
                      name="inStock"
                      control={methods.control}
                      render={({ field }) => <Switch {...field} checked={field.value} />}
                    />
                  }
                  label="In Stock"
                />
              </Stack>
            </Card>

            <Stack direction="row" spacing={1.5} sx={{ position: 'sticky', top: 24 }}>
              <Button fullWidth color="inherit" variant="outlined" size="large" onClick={() => router.back()}>
                Cancel
              </Button>
              <LoadingButton type="submit" variant="contained" size="large" loading={isSubmitting} fullWidth>
                {!currentProduct ? 'Create' : 'Save Changes'}
              </LoadingButton>
            </Stack>
          </Stack>
        </Grid>
      </Grid>
    </Form>
  );
}
