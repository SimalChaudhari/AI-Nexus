import { z as zod } from 'zod';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import { TextField } from '@mui/material';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import Alert from '@mui/material/Alert';
import { alpha, useTheme } from '@mui/material/styles';

import { CONFIG } from 'src/config-global';
import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Iconify } from 'src/components/iconify';
import { SvgColor } from 'src/components/svg-color';
import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { Upload } from 'src/components/upload';
import { createCourse, updateCourse } from 'src/store/slices/courseSlice';
import { speakerService } from 'src/services/speaker.service';
import { courseService } from 'src/services/course.service';

import { isEffectivelyEmptyHtml } from 'src/utils/html-plain-text';

import { CourseModulesCard } from './course-modules-card';
import { CourseQuestionBankPanel } from './course-question-bank-panel';
import { COURSE_LANGUAGE_OPTIONS } from './data/language-options';

// ----------------------------------------------------------------------

const parseMarketData = (marketData) => {
  if (!marketData || typeof marketData !== 'string') return {};
  try {
    const parsed = JSON.parse(marketData);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
};

export const NewCourseSchema = zod.object({
  title: zod
    .string()
    .trim()
    .min(1, { message: 'Title is required!' })
    .max(200, { message: 'Title must be 200 characters or less' }),
  description: zod
    .string()
    .optional()
    .refine((val) => !val || val.length <= 50000, { message: 'Description is too long' }),
  image: zod.string().optional(),
  freeOrPaid: zod.boolean().optional(),
  amount: zod.preprocess((val) => {
    if (val === '' || val === undefined || val === null) return undefined;
    const num = Number(val);
    return Number.isNaN(num) ? undefined : num;
  }, zod.number().optional()),
  level: zod.string(),
  languageIds: zod.array(zod.string()).optional(),
  speakerIds: zod.array(zod.string()).optional(),
  cpeHours: zod.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    zod.number().min(0).optional()
  ),
  lessonCount: zod.preprocess(
    (val) =>
      val === '' || val === undefined || val === null
        ? undefined
        : typeof val === 'number'
          ? val
          : Number(val),
    zod.union([zod.number().min(0), zod.string()]).optional()
  ),
  isBundle: zod.boolean().optional(),
  bundleCourseIds: zod.array(zod.string()).optional(),
});

// ----------------------------------------------------------------------

export function CourseNewEditForm({ currentCourse, onCancel }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const router = useRouter();
  const { creating, updating } = useSelector((state) => state.courses);
  const isEdit = Boolean(currentCourse);

  const [previewImage, setPreviewImage] = useState(currentCourse?.image || null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageDeleted, setImageDeleted] = useState(false);
  const [speakers, setSpeakers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  /** Pending modules/sections when creating a course (before save); sent with create payload */
  const [pendingModules, setPendingModules] = useState([]);
  const [coursesCatalog, setCoursesCatalog] = useState([]);

  const market = useMemo(
    () => parseMarketData(currentCourse?.marketData),
    [currentCourse?.marketData]
  );

  const defaultValues = useMemo(
    () => ({
      title: currentCourse?.title || '',
      description: currentCourse?.description || '',
      image: currentCourse?.image || '',
      freeOrPaid: currentCourse?.freeOrPaid ?? false,
      amount: currentCourse?.amount && currentCourse.amount > 0 ? currentCourse.amount : undefined,
      level: currentCourse?.level || 'Beginner',
      languageIds: Array.isArray(currentCourse?.languageIds) ? currentCourse.languageIds : [],
      speakerIds: Array.isArray(currentCourse?.speakerIds) ? currentCourse.speakerIds : [],
      cpeHours: market.cpeHours ?? market.cpe ?? undefined,
      lessonCount: market.lessonCount ?? market.lessons ?? undefined,
      isBundle: currentCourse?.isBundle ?? false,
      bundleCourseIds: Array.isArray(currentCourse?.bundleCourseIds) ? currentCourse.bundleCourseIds : [],
    }),
    [currentCourse, market]
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all([speakerService.getAll(), courseService.getCourseGroups()])
      .then(([speakerList, groupList]) => {
        if (!cancelled) {
          setSpeakers(speakerList || []);
          setGroups(groupList || []);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    courseService
      .getAllCourses({ page: 1, limit: 500 })
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : res?.data || [];
        setCoursesCatalog(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Initialize preview image from currentCourse
  useEffect(() => {
    if (currentCourse?.image) {
      setPreviewImage(currentCourse.image);
    }
  }, [currentCourse]);

  const methods = useForm({
    mode: 'onTouched',
    reValidateMode: 'onBlur',
    shouldFocusError: true,
    resolver: zodResolver(NewCourseSchema),
    defaultValues,
  });

  const { reset, setValue, watch, handleSubmit, getValues } = methods;

  useEffect(() => {
    if (!currentCourse && groups.length > 0) {
      const currentLevel = getValues('level');
      const exists = groups.some((group) => group.name === currentLevel);
      if (!exists) {
        setValue('level', groups[0].name, { shouldValidate: true });
      }
    }
  }, [currentCourse, getValues, groups, setValue]);

  // Use Redux loading state instead of form's isSubmitting
  const isSubmitting = currentCourse ? updating : creating;

  const cardSx = {
    borderRadius: 2,
    border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
    boxShadow: 'none',
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    router.push(paths.admin.course.list);
  };

  const freeOrPaid = watch('freeOrPaid');
  const isBundle = watch('isBundle');

  // Clear amount when switching to free
  useEffect(() => {
    if (freeOrPaid === false) {
      setValue('amount', undefined, { shouldValidate: true });
    }
  }, [freeOrPaid, setValue]);

  useEffect(() => {
    if (!isBundle) {
      setValue('bundleCourseIds', [], { shouldValidate: true });
    }
  }, [isBundle, setValue]);

  // Reset form and preview when currentCourse changes
  useEffect(() => {
    if (currentCourse?.id) {
      const img = currentCourse.image || '';
      const marketReset = parseMarketData(currentCourse.marketData);
      reset({
        title: currentCourse.title || '',
        description: currentCourse.description || '',
        image: img,
        freeOrPaid: currentCourse.freeOrPaid ?? false,
        amount: currentCourse.amount && currentCourse.amount > 0 ? currentCourse.amount : undefined,
        level: currentCourse.level || 'Beginner',
        languageIds: Array.isArray(currentCourse.languageIds) ? currentCourse.languageIds : [],
        speakerIds: Array.isArray(currentCourse.speakerIds) ? currentCourse.speakerIds : [],
        cpeHours: marketReset.cpeHours ?? marketReset.cpe ?? undefined,
        lessonCount: marketReset.lessonCount ?? marketReset.lessons ?? undefined,
        isBundle: currentCourse.isBundle ?? false,
        bundleCourseIds: Array.isArray(currentCourse.bundleCourseIds) ? currentCourse.bundleCourseIds : [],
      });
      setPreviewImage(img || null);
      setSelectedFile(null);
      setImageDeleted(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCourse?.id, reset]);

  const handleCreateGroup = useCallback(async () => {
    const name = newGroupName.trim();
    if (!name) {
      toast.error('Group name is required');
      return;
    }

    try {
      setCreatingGroup(true);
      const createdGroup = await courseService.createCourseGroup(name);
      setGroups((prev) => [...prev, createdGroup].sort((a, b) => a.name.localeCompare(b.name)));
      setValue('level', createdGroup.name, { shouldValidate: true });
      setNewGroupName('');
      toast.success('Group created');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to create group');
    } finally {
      setCreatingGroup(false);
    }
  }, [newGroupName, setValue]);

  // Handle image drop - store file for upload (not base64)
  const handleDropImage = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    // Create preview for display (base64 for preview only)
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result; // For preview only
      setPreviewImage(base64String);
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsDataURL(file); // For preview only

    // Store the actual file for upload
    setSelectedFile(file);
    setImageDeleted(false); // Reset delete flag when new file is selected
  }, []);

  // Handle image delete
  const handleDeleteImage = useCallback(async () => {
    setPreviewImage(null);
    setSelectedFile(null);

    if (currentCourse?.id) {
      // Existing course: delete immediately via API so path + file dono hat jaye
      try {
        await courseService.deleteCourseImage(currentCourse.id);
        setImageDeleted(false);
        // Clear the image field in the form model
        setValue('image', '', { shouldValidate: false });
        toast.success('Cover image removed');
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Failed to delete cover image');
      }
    } else {
      // New course (not yet saved): just mark deleted so submit logic can handle it
      setImageDeleted(true);
      setValue('image', '', { shouldValidate: false });
    }
  }, [currentCourse?.id, setValue]);

  const handleEditorMediaUpload = async (file) => {
    try {
      return await courseService.uploadCourseEditorMedia(file);
    } catch (error) {
      toast.error(error?.message || 'Media upload failed');
      return '';
    }
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      const marketDataObj = {};
      if (data.cpeHours != null && data.cpeHours !== '')
        marketDataObj.cpeHours = Number(data.cpeHours);
      if (data.lessonCount != null && data.lessonCount !== '')
        marketDataObj.lessonCount = Number(data.lessonCount);
      const marketDataStr =
        Object.keys(marketDataObj).length > 0 ? JSON.stringify(marketDataObj) : undefined;

      const courseData = {
        title: data.title.trim(),
        description: isEffectivelyEmptyHtml(data.description || '')
          ? undefined
          : data.description,
        freeOrPaid: data.freeOrPaid ?? false,
        amount: data.freeOrPaid && data.amount != null ? parseFloat(data.amount.toString()) : 0,
        level: data.level || 'Beginner',
        languageIds: Array.isArray(data.languageIds) ? data.languageIds : undefined,
        speakerIds: Array.isArray(data.speakerIds) ? data.speakerIds : undefined,
        marketData: marketDataStr,
        isBundle: data.isBundle ?? false,
        bundleCourseIds: data.isBundle && Array.isArray(data.bundleCourseIds) ? data.bundleCourseIds : [],
      };
      if (!currentCourse && Array.isArray(pendingModules) && pendingModules.length > 0 && !data.isBundle) {
        courseData.modules = pendingModules.map((mod) => ({
          title: mod.title || '',
          description: mod.description || undefined,
          sortOrder: mod.sortOrder,
          sections: (mod.sections || []).map((sec) => ({
            title: sec.title || '',
            videoUrl: sec.videoUrl || undefined,
            description: sec.description || undefined,
            content: sec.content || undefined,
            watchtime: sec.watchtime || undefined,
            images: Array.isArray(sec.images) ? sec.images : undefined,
            sortOrder: sec.sortOrder,
          })),
        }));
      }

      const imageFile = imageDeleted ? null : selectedFile || undefined;

      if (currentCourse) {
        await dispatch(
          updateCourse({
            id: currentCourse.id,
            courseData,
            imageFile,
          })
        ).unwrap();
        toast.success('Course updated successfully!');
        router.push(paths.admin.course.list);
      } else {
        const created = await dispatch(
          createCourse({
            courseData,
            imageFile,
          })
        ).unwrap();
        toast.success('Course created successfully!');
        router.push(paths.admin.course.list);
      }
    } catch (error) {
      const errorMessage = error || 'Failed to save course';
      toast.error(errorMessage);
      console.error('Error saving course:', error);
    }
  });

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid xs={12}>
          <Stack spacing={3}>
            {/* Course basics */}
            <Card sx={cardSx}>
              <CardHeader
                title={isEdit ? 'Edit course' : 'Create course'}
                subheader="Title, group, pricing, cover image, and rich-text description for the catalog."
                sx={{ px: 3, pt: 3, pb: 0, alignItems: 'flex-start' }}
                action={
                  <Box
                    sx={{
                      flexShrink: 0,
                      width: 48,
                      height: 48,
                      borderRadius: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                      color: 'primary.main',
                    }}
                  >
                    <SvgColor
                      src={`${CONFIG.site.basePath}/assets/icons/navbar/ic-course.svg`}
                      sx={{ width: 28, height: 28, color: 'primary.main' }}
                    />
                  </Box>
                }
              />
              <Divider sx={{ mx: 3, my: 2 }} />
              <Grid container spacing={2} sx={{ px: 3, pb: 3 }}>
                <Grid xs={12} md={8}>
                  <Field.Text name="title" label="Title" required />
                </Grid>
                <Grid xs={12} md={4}>
                  <Field.Autocomplete
                    name="level"
                    label="Group / Level"
                    options={(groups || []).map((group) => group.name)}
                    getOptionLabel={(option) => option || ''}
                    isOptionEqualToValue={(option, value) => option === value}
                    placeholder="Search group..."
                  />
                </Grid>

                <Grid xs={12}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    alignItems={{ sm: 'center' }}
                  >
                    <TextField
                      fullWidth
                      size="small"
                      label="Create new group"
                      value={newGroupName}
                      onChange={(event) => setNewGroupName(event.target.value)}
                      placeholder="e.g. Expert"
                    />
                    <LoadingButton
                      variant="outlined"
                      loading={creatingGroup}
                      onClick={handleCreateGroup}
                      sx={{ minWidth: { sm: 140 } }}
                    >
                      Add Group
                    </LoadingButton>
                  </Stack>
                </Grid>

                
                <Grid xs={12} md={4}>
                  <Field.Switch name="freeOrPaid" label="Paid course" />
                </Grid>
                {freeOrPaid && (
                  <Grid xs={12} md={4}>
                    <Field.Text
                      name="amount"
                      label="Price (SGD)"
                      type="number"
                      inputProps={{ step: '0.01', min: 0 }}
                      placeholder="e.g. 99.00"
                    />
                  </Grid>
                )}

                <Grid xs={12}>
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      border: `1px solid ${alpha(theme.palette.secondary.main, 0.28)}`,
                      background: `linear-gradient(
                        120deg,
                        ${alpha(theme.palette.secondary.main, 0.09)} 0%,
                        ${alpha(theme.palette.primary.main, 0.05)} 55%,
                        ${alpha(theme.palette.grey[500], 0.04)} 100%
                      )`,
                    }}
                  >
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }} sx={{ mb: isBundle ? 2 : 0 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 1.5,
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: alpha(theme.palette.secondary.main, 0.16),
                          color: 'secondary.dark',
                          border: `1px solid ${alpha(theme.palette.secondary.main, 0.28)}`,
                        }}
                      >
                        <Iconify icon="solar:layers-bold" width={26} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
                          Course bundle
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.55, mb: 1 }}>
                          Turn this product into a bundle: learners who purchase or enroll here get access to every
                          selected course below—no second checkout for those programs.
                        </Typography>
                        <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.25, color: 'text.secondary', typography: 'caption' }}>
                          <li>Modules for this row are hidden; content lives on the included courses.</li>
                          <li>Inner courses can stay “paid” in the catalog; bundle ownership unlocks them.</li>
                        </Stack>
                      </Box>
                    </Stack>
                    <Divider sx={{ borderStyle: 'dashed', my: 2 }} />
                    <Grid container spacing={2} alignItems="flex-start">
                      <Grid xs={12} sm={6} md={4}>
                        <Field.Switch name="isBundle" label="Enable bundle" />
                      </Grid>
                      {isBundle && (
                        <Grid xs={12}>
                          <Box
                            sx={{
                              p: 2,
                              borderRadius: 1.5,
                              bgcolor: 'background.paper',
                              border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                              boxShadow: theme.customShadows?.z4 ?? theme.shadows[4],
                            }}
                          >
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                              Programs in this bundle
                            </Typography>
                            <Field.Autocomplete
                              name="bundleCourseIds"
                              label="Select courses"
                              multiple
                              disableCloseOnSelect
                              options={coursesCatalog
                                .filter((c) => c.id && c.id !== currentCourse?.id)
                                .map((c) => c.id)}
                              getOptionLabel={(option) =>
                                coursesCatalog.find((c) => c.id === option)?.title || option
                              }
                              isOptionEqualToValue={(option, value) => option === value}
                              filterSelectedOptions
                              placeholder="Search and add courses…"
                            />
                            <Alert severity="info" variant="outlined" sx={{ mt: 2, py: 0.75 }} icon={<Iconify icon="solar:info-circle-bold" width={20} />}>
                              Order follows your selection. Save the course to apply changes on the learning site.
                            </Alert>
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                </Grid>

                <Grid xs={12}>
                  <Alert severity="info" sx={{ mb: 2 }} icon={<Iconify icon="solar:info-circle-bold" width={22} />}>
                    Use the toolbar for <strong>bold</strong>, lists, and links. This appears on the public course page
                    (plain-text parts are used for short previews).
                  </Alert>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Description
                  </Typography>
                  <Field.Editor
                    name="description"
                    placeholder="Overview, learning outcomes, prerequisites…"
                    fullItem={false}
                    onUploadImage={handleEditorMediaUpload}
                  />
                </Grid>

                <Grid xs={12}>
                  <Divider sx={{ borderStyle: 'dashed', my: 0.5 }} />
                  <Typography variant="subtitle2" sx={{ mb: 2, mt: 1 }}>
                    Cover image
                  </Typography>
                  <Upload
                    value={selectedFile || previewImage}
                    onDrop={handleDropImage}
                    onDelete={handleDeleteImage}
                    maxSize={5 * 1024 * 1024}
                    accept={{
                      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
                    }}
                  />
                </Grid>
              </Grid>
            </Card>

            {!isBundle && (
              <CourseModulesCard
                courseId={currentCourse?.id ?? null}
                pendingModules={pendingModules}
                onPendingModulesChange={setPendingModules}
              />
            )}

            {/* Learning & instructors */}
            <Card sx={cardSx}>
              <CardHeader
                title="Learning & instructors"
                subheader="Speakers, languages, and optional CPE / lesson metadata."
                sx={{ px: 3, pt: 3, pb: 0 }}
              />
              <Divider sx={{ mx: 3, my: 2 }} />
              <Grid container spacing={2} sx={{ px: 3, pb: 3 }}>
                <Grid xs={12} md={3}>
                  <Field.Autocomplete
                    name="speakerIds"
                    label="Speakers"
                    multiple
                    disableCloseOnSelect
                    options={(speakers || []).map((s) => s.id)}
                    getOptionLabel={(option) =>
                      speakers.find((s) => s.id === option)?.name || option
                    }
                    isOptionEqualToValue={(option, value) => option === value}
                    filterSelectedOptions
                    placeholder="Search speakers..."
                  />
                </Grid>

                <Grid xs={12} md={3}>
                  <Field.Autocomplete
                    name="languageIds"
                    label="Languages"
                    multiple
                    disableCloseOnSelect
                    options={COURSE_LANGUAGE_OPTIONS}
                    getOptionLabel={(option) => option}
                    isOptionEqualToValue={(option, value) => option === value}
                    filterSelectedOptions
                    placeholder="Search and select languages..."
                  />
                </Grid>

                <Grid xs={12} md={3}>
                  <Field.Text
                    name="cpeHours"
                    label="CPE hours"
                    type="number"
                    inputProps={{ step: '0.5', min: 0 }}
                    placeholder="e.g. 2"
                  />
                </Grid>

                <Grid xs={12} md={3}>
                  <Field.Text
                    name="lessonCount"
                    label="Lesson count"
                    type="number"
                    inputProps={{ step: 1, min: 0 }}
                    placeholder="e.g. 10"
                  />
                </Grid>
              </Grid>
            </Card>

            {isEdit && currentCourse?.id && (
              <CourseQuestionBankPanel courseId={currentCourse.id} />
            )}

            <Card
              sx={{
                ...cardSx,
                p: 2,
                position: 'sticky',
                bottom: 16,
                zIndex: (t) => t.zIndex.appBar - 1,
                bgcolor: 'background.paper',
              }}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                <Button
                  size="large"
                  color="inherit"
                  variant="outlined"
                  startIcon={<Iconify icon="eva:arrow-back-fill" />}
                  onClick={handleCancel}
                >
                  Cancel
                </Button>

                <LoadingButton
                  type="submit"
                  variant="contained"
                  loading={isSubmitting}
                  size="large"
                  startIcon={<Iconify icon={isEdit ? 'eva:checkmark-fill' : 'solar:add-circle-bold'} />}
                >
                  {isEdit ? 'Update course' : 'Create course'}
                </LoadingButton>
              </Stack>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Form>
  );
}
