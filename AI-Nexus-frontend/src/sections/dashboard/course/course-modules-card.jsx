import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Drawer from '@mui/material/Drawer';
import TextField from '@mui/material/TextField';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import Tooltip from '@mui/material/Tooltip';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import CircularProgress from 'src/components/loading/circular-progress';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Editor } from 'src/components/editor';
import { Upload } from 'src/components/upload';
import { RichTextContent } from 'src/components/html-content';
import { courseService } from 'src/services/course.service';
import { SpotlightrVideoIframe } from 'src/components/spotlightr-video-iframe/spotlightr-video-iframe';
import { isSpotlightrUrl } from 'src/utils/spotlightr';
import { getVideoSourceKind } from 'src/utils/video-source';
import { getYouTubeEmbedUrl } from 'src/utils/youtube';

function nextTempId() {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const SECTION_LEARNING_MATERIAL_ACCEPT = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
};

function normalizeEditorHtml(value) {
  const html = String(value || '').trim();
  if (!html || html === '<p></p>' || html === '<p><br></p>') return undefined;
  const plain = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
  if (!plain) return undefined;
  return html;
}

function hasDisplayableHtml(value) {
  return Boolean(normalizeEditorHtml(value));
}

function getSectionPreviewType(section) {
  if (section?.videoUrl) return 'video';
  if (Array.isArray(section?.images) && section.images.length > 0) return 'images';
  if (Array.isArray(section?.attachments) && section.attachments.length > 0) return 'files';
  return 'text';
}

function normalizeWatchtime(value) {
  const text = String(value || '').trim();
  if (!text) return '';

  const hourMinuteSecond = text.match(/^(\d{1,3}):(\d{1,2}):(\d{1,2})$/);
  if (hourMinuteSecond) {
    const hours = Number(hourMinuteSecond[1]);
    const minutes = Number(hourMinuteSecond[2]);
    const seconds = Number(hourMinuteSecond[3]);
    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      Number.isNaN(seconds) ||
      minutes > 59 ||
      seconds > 59
    ) {
      return '';
    }
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  const minuteSecond = text.match(/^(\d{1,3}):(\d{1,2})$/);
  if (minuteSecond) {
    const minutes = Number(minuteSecond[1]);
    const seconds = Number(minuteSecond[2]);
    if (Number.isNaN(minutes) || Number.isNaN(seconds) || seconds > 59) return '';
    const totalSeconds = (minutes * 60) + seconds;
    const hh = Math.floor(totalSeconds / 3600);
    const mm = Math.floor((totalSeconds % 3600) / 60);
    const ss = totalSeconds % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }

  const secondsOnly = text.match(/^\d+$/);
  if (secondsOnly) {
    const totalSeconds = Number(text);
    if (Number.isNaN(totalSeconds)) return '';
    const hh = Math.floor(totalSeconds / 3600);
    const mm = Math.floor((totalSeconds % 3600) / 60);
    const ss = totalSeconds % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }

  return '';
}

function parseWatchtimeParts(value) {
  const normalized = normalizeWatchtime(value);
  if (!normalized) {
    return { minutes: '', seconds: '' };
  }
  const [hours, minutes, seconds] = normalized.split(':').map(Number);
  const totalMinutes = (hours * 60) + minutes;
  return { minutes: String(totalMinutes), seconds: String(seconds).padStart(2, '0') };
}

function watchtimeToSeconds(value) {
  const normalized = normalizeWatchtime(value);
  if (!normalized) return null;
  const [hours, minutes, seconds] = normalized.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes) || Number.isNaN(seconds)) return null;
  return (hours * 3600) + (minutes * 60) + seconds;
}

function formatDurationLabel(totalSeconds) {
  if (typeof totalSeconds !== 'number' || Number.isNaN(totalSeconds) || totalSeconds < 0) return '';
  const total = Math.floor(totalSeconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function SectionPreviewContent({ section }) {
  if (!section) return null;
  const type = getSectionPreviewType(section);

  if (type === 'video') {
    const url = (section.videoUrl || '').trim();
    const embedUrl = getYouTubeEmbedUrl(url);
    const spotlightr = isSpotlightrUrl(url);

    return (
      <Stack spacing={0}>
        {embedUrl ? (
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              pt: '56.25%',
              bgcolor: 'common.black',
              borderRadius: 1,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <iframe
              title="Video preview"
              src={embedUrl}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
              }}
            />
          </Box>
        ) : spotlightr ? (
          <SpotlightrVideoIframe
            url={url}
            title="Video preview"
            framed
            sx={{
              borderRadius: 1,
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          />
        ) : url ? (
          <Box
            component="video"
            src={url}
            controls
            sx={{
              width: '100%',
              display: 'block',
              minHeight: { xs: 220, sm: 320, md: 460 },
              borderRadius: 1.5,
              bgcolor: 'common.black',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          />
        ) : null}
      </Stack>
    );
  }

  if (type === 'images') {
    const images = Array.isArray(section.images) ? section.images : [];
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 1.5,
        }}
      >
        {images.map((imgUrl, idx) => (
          <Box
            key={`${imgUrl}-${idx}`}
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: 'common.white',
              border: (theme) => `1px solid ${theme.palette.divider}`,
            }}
          >
            <Box
              component="img"
              src={imgUrl}
              alt=""
              sx={{
                width: '100%',
                height: 220,
                objectFit: 'cover',
                display: 'block',
                borderRadius: 1,
                bgcolor: 'grey.50',
                border: (theme) => `1px solid ${theme.palette.divider}`,
              }}
            />
          </Box>
        ))}
      </Box>
    );
  }

  if (type === 'files') {
    const files = Array.isArray(section.attachments) ? section.attachments : [];
    return (
      <Stack spacing={1}>
        {files.map((url, idx) => (
          <Button
            key={`${url}-${idx}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            variant="outlined"
            startIcon={<Iconify icon="solar:document-bold" width={16} />}
            sx={{ justifyContent: 'flex-start' }}
          >
            {decodeURIComponent(String(url).split('/').pop() || `File ${idx + 1}`)}
          </Button>
        ))}
      </Stack>
    );
  }

  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 1.5,
        border: '1px solid #dfd5a8',
        bgcolor: '#fffdf1',
        color: 'grey.900',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.02)',
        lineHeight: 1.8,
      }}
    >
      <RichTextContent html={section.content || '<p>—</p>'} />
    </Box>
  );
}

function SectionPreviewDialog({ open, onClose, section }) {
  const previewType = section ? getSectionPreviewType(section) : null;
  const isVideoPreview = previewType === 'video';
  const isImagePreview = previewType === 'images';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={isVideoPreview ? 'lg' : 'md'}
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: isVideoPreview ? 'grey.900' : isImagePreview ? 'grey.100' : '#f3edd1',
          color: isVideoPreview ? 'common.white' : 'text.primary',
        },
      }}
    >
      <DialogTitle
        sx={{
          pb: 1.5,
          borderBottom: isVideoPreview ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.12)',
        }}
      >
        <Stack spacing={0.5}>
          <Typography
            variant="caption"
            sx={{
              color: isVideoPreview ? 'grey.400' : 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: 0.6,
            }}
          >
            {isVideoPreview ? 'Video preview' : isImagePreview ? 'Image gallery' : 'Notes preview'}
          </Typography>
          <Typography variant="h6">{section?.title || 'Preview'}</Typography>
        </Stack>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8, color: isVideoPreview ? 'common.white' : 'text.primary' }}
        >
          <Iconify icon="solar:close-circle-bold" width={24} />
        </IconButton>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          p: { xs: 1.25, sm: 2 },
          borderColor: isVideoPreview ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          bgcolor: isVideoPreview ? 'grey.900' : isImagePreview ? 'grey.100' : '#f7f1d8',
        }}
      >
        <Stack spacing={2}>
          <SectionPreviewContent section={section} />
          {hasDisplayableHtml(section?.description) ? (
            <Box
              sx={{
                p: 2,
                borderRadius: 1.5,
                border: '1px solid #dfd5a8',
                bgcolor: '#fffdf1',
              }}
            >
              <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 700 }}>
                Description
              </Typography>
              <RichTextContent html={section.description} />
            </Box>
          ) : null}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

export function CourseModulesCard({ courseId, pendingModules = [], onPendingModulesChange }) {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const isPendingMode = !courseId && typeof onPendingModulesChange === 'function';
  const displayModules = isPendingMode ? (pendingModules || []) : modules;
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [sectionModuleId, setSectionModuleId] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionSubtitle, setSectionSubtitle] = useState('');
  const [sectionLearningMaterials, setSectionLearningMaterials] = useState([]);
  const [sectionVideoUrl, setSectionVideoUrl] = useState('');
  const [sectionWatchMinutes, setSectionWatchMinutes] = useState('');
  const [sectionWatchSeconds, setSectionWatchSeconds] = useState('');
  const [sectionDescription, setSectionDescription] = useState('');
  const [sectionContent, setSectionContent] = useState('');
  const [sectionMediaType, setSectionMediaType] = useState('video'); // 'video' | 'content' | 'images' | 'files'
  const [sectionImages, setSectionImages] = useState([]); // (File | string)[] — files for new, strings (URLs) when editing
  const [sectionFiles, setSectionFiles] = useState([]); // (File | string)[]
  const [sectionVideoFile, setSectionVideoFile] = useState(null);
  const [sectionVideoPreviewUrl, setSectionVideoPreviewUrl] = useState('');
  const [sectionSaving, setSectionSaving] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [detectedVideoDurationSeconds, setDetectedVideoDurationSeconds] = useState(null);
  const [detectingVideoDuration, setDetectingVideoDuration] = useState(false);
  const [videoDurationError, setVideoDurationError] = useState('');
  const [customWatchtimeEnabled, setCustomWatchtimeEnabled] = useState(false);

  const [expandedModuleId, setExpandedModuleId] = useState(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'module', item } | { type: 'section', item } | null
  const [deleteInProgress, setDeleteInProgress] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSection, setPreviewSection] = useState(null);

  const fetchModules = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const list = await courseService.getCourseModulesWithSections(courseId);
      setModules(list || []);
    } catch {
      setModules([]);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (!courseId) {
      setLoading(false);
      return;
    }
    fetchModules();
  }, [courseId, fetchModules]);

  useEffect(() => {
    if (!(sectionVideoFile instanceof File)) {
      setSectionVideoPreviewUrl('');
      return undefined;
    }

    const objectUrl = URL.createObjectURL(sectionVideoFile);
    setSectionVideoPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [sectionVideoFile]);

  useEffect(() => {
    let canceled = false;

    const detectFromSource = (sourceUrl) =>
      new Promise((resolve, reject) => {
        const probe = document.createElement('video');
        probe.preload = 'metadata';
        probe.muted = true;
        probe.onloadedmetadata = () => {
          const duration = Number(probe.duration);
          if (Number.isFinite(duration) && duration > 0) {
            resolve(Math.round(duration));
          } else {
            reject(new Error('Could not detect duration'));
          }
        };
        probe.onerror = () => reject(new Error('Could not read video metadata'));
        probe.src = sourceUrl;
      });

    const detectDuration = async () => {
      if (!sectionDialogOpen || sectionMediaType !== 'video') {
        setDetectingVideoDuration(false);
        setDetectedVideoDurationSeconds(null);
        setVideoDurationError('');
        return;
      }

      if (sectionVideoFile instanceof File) {
        setDetectingVideoDuration(true);
        setVideoDurationError('');
        const objectUrl = URL.createObjectURL(sectionVideoFile);
        try {
          const seconds = await detectFromSource(objectUrl);
          if (!canceled) {
            setDetectedVideoDurationSeconds(seconds);
          }
        } catch {
          if (!canceled) {
            setDetectedVideoDurationSeconds(null);
            setVideoDurationError('Could not auto-detect uploaded video duration.');
          }
        } finally {
          URL.revokeObjectURL(objectUrl);
          if (!canceled) setDetectingVideoDuration(false);
        }
        return;
      }

      const trimmedUrl = (sectionVideoUrl || '').trim();
      if (!trimmedUrl) {
        setDetectingVideoDuration(false);
        setDetectedVideoDurationSeconds(null);
        setVideoDurationError('');
        return;
      }

      if (getYouTubeEmbedUrl(trimmedUrl)) {
        setDetectingVideoDuration(false);
        setDetectedVideoDurationSeconds(null);
        setVideoDurationError('Duration auto-detect is unavailable for YouTube links.');
        return;
      }

      if (isSpotlightrUrl(trimmedUrl)) {
        setDetectingVideoDuration(false);
        setDetectedVideoDurationSeconds(null);
        setVideoDurationError('Duration auto-detect is unavailable for Spotlightr links. Set watchtime manually.');
        return;
      }

      setDetectingVideoDuration(true);
      setVideoDurationError('');
      try {
        const seconds = await detectFromSource(trimmedUrl);
        if (!canceled) {
          setDetectedVideoDurationSeconds(seconds);
        }
      } catch {
        if (!canceled) {
          setDetectedVideoDurationSeconds(null);
          setVideoDurationError('Could not auto-detect duration from this video URL.');
        }
      } finally {
        if (!canceled) setDetectingVideoDuration(false);
      }
    };

    detectDuration();

    return () => {
      canceled = true;
    };
  }, [sectionDialogOpen, sectionMediaType, sectionVideoFile, sectionVideoUrl]);

  useEffect(() => {
    if (sectionMediaType !== 'video' || !detectedVideoDurationSeconds || customWatchtimeEnabled) return;
    const auto = parseWatchtimeParts(formatDurationLabel(detectedVideoDurationSeconds));
    setSectionWatchMinutes(auto.minutes);
    setSectionWatchSeconds(auto.seconds);
  }, [detectedVideoDurationSeconds, sectionMediaType, customWatchtimeEnabled]);

  const openAddModule = () => {
    setEditingModule(null);
    setFormTitle('');
    setFormDescription('');
    setModuleDialogOpen(true);
  };

  const openEditModule = (mod) => {
    setEditingModule(mod);
    setFormTitle(mod.title || '');
    setFormDescription(mod.description || '');
    setModuleDialogOpen(true);
  };

  const closeModuleDialog = () => {
    setModuleDialogOpen(false);
    setEditingModule(null);
    setFormTitle('');
    setFormDescription('');
  };

  const openAddSection = (mod) => {
    setSectionModuleId(mod.id);
    setEditingSection(null);
    setSectionTitle('');
    setSectionSubtitle('');
    setSectionLearningMaterials([]);
    setSectionVideoUrl('');
    setSectionWatchMinutes('');
    setSectionWatchSeconds('');
    setSectionDescription('');
    setSectionContent('');
    setSectionImages([]);
    setSectionVideoFile(null);
    setSectionVideoPreviewUrl('');
    setSectionMediaType('video');
    setCustomWatchtimeEnabled(false);
    setSectionDialogOpen(true);
  };

  const openEditSection = (mod, section) => {
    setSectionModuleId(mod.id);
    setEditingSection(section);
    setSectionTitle(section.title || '');
    setSectionSubtitle(section.subtitle || '');
    setSectionLearningMaterials(
      Array.isArray(section.learningMaterials) ? [...section.learningMaterials] : []
    );
    setSectionVideoUrl(section.videoUrl || '');
    const watchParts = parseWatchtimeParts(section.watchtime || '');
    setSectionWatchMinutes(watchParts.minutes);
    setSectionWatchSeconds(watchParts.seconds);
    setSectionDescription(section.description || '');
    setSectionContent(section.content || '');
    setSectionImages(Array.isArray(section.images) ? [...section.images] : []);
    setSectionFiles(Array.isArray(section.attachments) ? [...section.attachments] : []);
    setSectionVideoFile(null);
    setSectionVideoPreviewUrl('');
    if (section.videoUrl) setSectionMediaType('video');
    else if (Array.isArray(section.images) && section.images.length > 0) setSectionMediaType('images');
    else if (Array.isArray(section.attachments) && section.attachments.length > 0) setSectionMediaType('files');
    else setSectionMediaType('content');
    // If a watchtime is already stored, keep "Customize" on so auto-duration detection does not
    // overwrite the loaded minutes/seconds (useEffect sync only runs when Customize is off).
    if (section.videoUrl && String(section.watchtime || '').trim()) {
      setCustomWatchtimeEnabled(true);
    } else {
      setCustomWatchtimeEnabled(false);
    }
    setSectionDialogOpen(true);
  };

  const closeSectionDialog = () => {
    setSectionDialogOpen(false);
    setSectionModuleId(null);
    setEditingSection(null);
    setSectionTitle('');
    setSectionSubtitle('');
    setSectionLearningMaterials([]);
    setSectionVideoUrl('');
    setSectionWatchMinutes('');
    setSectionWatchSeconds('');
    setSectionDescription('');
    setSectionContent('');
    setSectionImages([]);
    setSectionFiles([]);
    setSectionVideoFile(null);
    setSectionVideoPreviewUrl('');
    setSectionMediaType('video');
    setCustomWatchtimeEnabled(false);
  };

  const buildSectionLearningMaterialUrls = async () => {
    const existingUrls = sectionLearningMaterials.filter((item) => typeof item === 'string');
    const newFiles = sectionLearningMaterials.filter((item) => item instanceof File);
    if (!newFiles.length) return existingUrls;
    const uploadedUrls = await courseService.uploadSectionLearningMaterials(newFiles);
    return [...existingUrls, ...uploadedUrls];
  };

  const handleSaveModule = async () => {
    const title = (formTitle || '').trim();
    if (!title) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    try {
      if (isPendingMode) {
        const description = normalizeEditorHtml(formDescription);
        if (editingModule) {
          const next = (pendingModules || []).map((m) =>
            m.id === editingModule.id ? { ...m, title, description } : m
          );
          onPendingModulesChange(next);
          toast.success('Module updated');
        } else {
          const newMod = { id: nextTempId(), title, description, sortOrder: (pendingModules || []).length, sections: [] };
          onPendingModulesChange([...(pendingModules || []), newMod]);
          toast.success('Module added');
        }
        closeModuleDialog();
      } else {
        if (editingModule) {
          await courseService.updateCourseModule(editingModule.id, {
            title,
            description: normalizeEditorHtml(formDescription),
          });
          toast.success('Module updated');
        } else {
          await courseService.createCourseModule(courseId, {
            title,
            description: normalizeEditorHtml(formDescription),
          });
          toast.success('Module added');
        }
        closeModuleDialog();
        fetchModules();
      }
    } catch (e) {
      toast.error(e?.message || 'Failed to save module');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteModule = (mod) => {
    setDeleteTarget({ type: 'module', item: mod });
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDeleteModule = async () => {
    if (!deleteTarget || deleteTarget.type !== 'module') return;
    const mod = deleteTarget.item;
    setDeleteInProgress(true);
    try {
      if (isPendingMode) {
        onPendingModulesChange((pendingModules || []).filter((m) => m.id !== mod.id));
        toast.success('Module deleted');
        setDeleteConfirmOpen(false);
        setDeleteTarget(null);
      } else {
        await courseService.deleteCourseModule(mod.id);
        toast.success('Module deleted');
        setDeleteConfirmOpen(false);
        setDeleteTarget(null);
        fetchModules();
      }
    } catch (e) {
      toast.error(e?.message || 'Failed to delete module');
    } finally {
      setDeleteInProgress(false);
    }
  };

  const handleDeleteSection = (section) => {
    setDeleteTarget({ type: 'section', item: section });
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDeleteSection = async () => {
    if (!deleteTarget || deleteTarget.type !== 'section') return;
    const section = deleteTarget.item;
    setDeleteInProgress(true);
    try {
      if (isPendingMode) {
        const next = (pendingModules || []).map((m) => ({
          ...m,
          sections: (m.sections || []).filter((s) => s.id !== section.id),
        }));
        onPendingModulesChange(next);
        toast.success('Section deleted');
        setDeleteConfirmOpen(false);
        setDeleteTarget(null);
      } else {
        await courseService.deleteModuleSection(section.id);
        toast.success('Section deleted');
        setDeleteConfirmOpen(false);
        setDeleteTarget(null);
        fetchModules();
      }
    } catch (e) {
      toast.error(e?.message || 'Failed to delete section');
    } finally {
      setDeleteInProgress(false);
    }
  };

  const closeDeleteConfirm = () => {
    if (!deleteInProgress) {
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
    }
  };

  const openPreview = (section) => {
    setPreviewSection(section);
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewSection(null);
  };

  const handleSectionContentMediaUpload = useCallback(async (file) => {
    try {
      return await courseService.uploadCourseEditorMedia(file);
    } catch (error) {
      toast.error(error?.message || 'Media upload failed');
      return '';
    }
  }, []);

  const handleSaveSection = async () => {
    const title = (sectionTitle || '').trim();
    if (!title) {
      toast.error('Section title is required');
      return;
    }
    if (sectionMediaType === 'video' && !(sectionVideoUrl || '').trim() && !sectionVideoFile) {
      toast.error('Enter a video URL or upload a video file');
      return;
    }
    const trimmedVideoUrl = (sectionVideoUrl || '').trim();
    if (
      sectionMediaType === 'video' &&
      trimmedVideoUrl &&
      (trimmedVideoUrl.includes('youtube') || trimmedVideoUrl.includes('youtu.be')) &&
      !getYouTubeEmbedUrl(trimmedVideoUrl)
    ) {
      toast.error('Invalid YouTube URL. Use https://www.youtube.com/watch?v=VIDEO_ID');
      return;
    }
    if (sectionMediaType === 'content' && !(sectionContent || '').trim()) {
      toast.error('Add some content or switch to Video URL');
      return;
    }
    if (sectionMediaType === 'images' && (!sectionImages || sectionImages.length === 0)) {
      toast.error('Add at least one image or choose another media type');
      return;
    }
    if (sectionMediaType === 'files' && (!sectionFiles || sectionFiles.length === 0)) {
      toast.error('Add at least one file or choose another media type');
      return;
    }
    if (!sectionModuleId) return;
    setSectionSaving(true);
    try {
      const learningMaterials = isPendingMode
        ? sectionLearningMaterials
        : await buildSectionLearningMaterialUrls();

      const payload = {
        title,
        subtitle: sectionSubtitle.trim() || undefined,
        description: normalizeEditorHtml(sectionDescription),
        videoUrl: sectionMediaType === 'video' ? (sectionVideoUrl.trim() || undefined) : undefined,
        content: sectionMediaType === 'content' ? (sectionContent.trim() || undefined) : undefined,
        learningMaterials:
          Array.isArray(learningMaterials) && learningMaterials.length > 0
            ? learningMaterials
            : undefined,
      };
      const pastedVideoUrl = (sectionVideoUrl || '').trim();
      const pastedIsExternal =
        pastedVideoUrl && (getYouTubeEmbedUrl(pastedVideoUrl) || isSpotlightrUrl(pastedVideoUrl));

      if (
        sectionMediaType === 'video' &&
        sectionVideoFile instanceof File &&
        !pastedIsExternal
      ) {
        payload.videoUrl = await courseService.uploadSectionVideo(sectionVideoFile);
        if (!payload.videoUrl) {
          throw new Error('Video upload failed. Please try again.');
        }
      } else if (sectionMediaType === 'video' && pastedVideoUrl) {
        payload.videoUrl = pastedVideoUrl;
      }
      if (sectionMediaType === 'video') {
        const combinedWatchtime =
          sectionWatchMinutes || sectionWatchSeconds
            ? `${sectionWatchMinutes || '0'}:${sectionWatchSeconds || '0'}`
            : '';
        const wt = normalizeWatchtime(combinedWatchtime);
        if (customWatchtimeEnabled && !wt) {
          throw new Error('Enter custom watchtime in minutes and seconds.');
        }
        if (combinedWatchtime && !wt) {
          throw new Error('Enter valid watchtime in minutes and seconds.');
        }
        const enteredSeconds = wt ? watchtimeToSeconds(wt) : null;
        if (
          detectedVideoDurationSeconds != null &&
          enteredSeconds != null &&
          enteredSeconds > detectedVideoDurationSeconds
        ) {
          throw new Error(
            `Watchtime cannot exceed video duration (${formatDurationLabel(detectedVideoDurationSeconds)}).`
          );
        }
        payload.watchtime = wt || null;
        let durationTimeValue = null;
        if (detectedVideoDurationSeconds != null) {
          const dn = normalizeWatchtime(formatDurationLabel(detectedVideoDurationSeconds));
          durationTimeValue = dn || null;
        } else if (
          editingSection &&
          !(sectionVideoFile instanceof File) &&
          (sectionVideoUrl || '').trim() === (editingSection.videoUrl || '').trim() &&
          editingSection.durationTime
        ) {
          durationTimeValue = editingSection.durationTime;
        }
        payload.durationTime = durationTimeValue;
      }
      if (sectionMediaType === 'images') {
        const existingUrls = sectionImages.filter((item) => typeof item === 'string');
        const newFiles = sectionImages.filter((item) => item instanceof File);
        let allUrls = existingUrls;
        if (newFiles.length > 0) {
          const uploadedUrls = await courseService.uploadSectionImages(newFiles);
          allUrls = [...existingUrls, ...uploadedUrls];
        }
        payload.images = allUrls.length > 0 ? allUrls : undefined;
        payload.videoUrl = undefined;
        payload.content = undefined;
      }
      if (sectionMediaType === 'files') {
        const existingUrls = sectionFiles.filter((item) => typeof item === 'string');
        const newFiles = sectionFiles.filter((item) => item instanceof File);
        let allUrls = existingUrls;
        if (newFiles.length > 0) {
          const uploadedUrls = await courseService.uploadSectionFiles(newFiles);
          allUrls = [...existingUrls, ...uploadedUrls];
        }
        payload.attachments = allUrls.length > 0 ? allUrls : undefined;
        payload.videoUrl = undefined;
        payload.content = undefined;
        payload.images = undefined;
      }
      if (isPendingMode) {
        const list = pendingModules || [];
        const modIndex = list.findIndex((m) => m.id === sectionModuleId);
        if (modIndex === -1) {
          closeSectionDialog();
          return;
        }
        const mod = list[modIndex];
        const sections = mod.sections || [];
        if (editingSection) {
          const nextSections = sections.map((s) =>
            s.id === editingSection.id ? { ...s, ...payload } : s
          );
          const nextModules = [...list];
          nextModules[modIndex] = { ...mod, sections: nextSections };
          onPendingModulesChange(nextModules);
          toast.success('Section updated');
        } else {
          const newSec = { id: nextTempId(), ...payload, sortOrder: sections.length };
          const nextModules = [...list];
          nextModules[modIndex] = { ...mod, sections: [...sections, newSec] };
          onPendingModulesChange(nextModules);
          toast.success('Section added');
        }
        closeSectionDialog();
      } else {
        if (editingSection) {
          await courseService.updateModuleSection(editingSection.id, payload);
          toast.success('Section updated');
        } else {
          await courseService.createModuleSection(courseId, sectionModuleId, payload);
          toast.success('Section added');
        }
        closeSectionDialog();
        fetchModules();
      }
    } catch (e) {
      toast.error(e?.message || 'Failed to save section');
    } finally {
      setSectionSaving(false);
      setVideoUploadProgress(0);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteTarget?.type === 'module') handleConfirmDeleteModule();
    if (deleteTarget?.type === 'section') handleConfirmDeleteSection();
  };

  const deleteConfirmTitle = deleteTarget?.type === 'module'
    ? 'Delete module?'
    : deleteTarget?.type === 'section'
      ? 'Delete section?'
      : 'Delete?';
  const deleteConfirmMessage = deleteTarget?.type === 'module'
    ? `"${deleteTarget?.item?.title}" and all its sections will be removed. This cannot be undone.`
    : deleteTarget?.type === 'section'
      ? `"${deleteTarget?.item?.title}" will be removed. This cannot be undone.`
      : '';

  const hasCourse = Boolean(courseId) || isPendingMode;

  return (
    <>
      <Card sx={{ p: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
          spacing={{ xs: 1.5, sm: 0 }}
          sx={{ mb: 2 }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Course modules & sections
          </Typography>
          <Tooltip title={!hasCourse ? 'Save the course first to add modules and sections.' : ''}>
            <span>
              <Button
                size="small"
                variant="contained"
                startIcon={<Iconify icon="eva:plus-fill" width={18} />}
                onClick={openAddModule}
                disabled={!hasCourse}
                fullWidth
                sx={{
                  width: { xs: 1, sm: 'auto' },
                  alignSelf: { xs: 'stretch', sm: 'center' },
                }}
              >
                Add module
              </Button>
            </span>
          </Tooltip>
        </Stack>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          Add modules (e.g. Introduction, Detecting Financial Deception). Under each module you can add multiple sections (e.g. Occupational Fraud, Preventing Fraud). They appear in the learning player sidebar.
        </Typography>
        {!hasCourse ? (
          <Box
            sx={{
              py: 4,
              px: 2,
              textAlign: 'center',
              borderRadius: 1.5,
              border: (theme) => `1px dashed ${theme.palette.divider}`,
              bgcolor: 'background.neutral',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Save the course first to add modules and sections.
            </Typography>
          </Box>
        ) : !isPendingMode && loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 4 }} spacing={1}>
            <CircularProgress size={24} />
            <Typography variant="body2" color="text.secondary">Loading modules...</Typography>
          </Stack>
        ) : displayModules.length === 0 ? (
          <Box
            sx={{
              py: 4,
              px: 2,
              textAlign: 'center',
              borderRadius: 1.5,
              border: (theme) => `1px dashed ${theme.palette.divider}`,
              bgcolor: 'background.neutral',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No modules yet. Click &quot;Add module&quot; to add one.
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {displayModules.map((mod, index) => {
              const sections = mod.sections || [];
              const isExpanded = expandedModuleId === mod.id;
              return (
                <Box key={mod.id} sx={{ mb: 1 }}>
                  <ListItem
                    secondaryAction={
                      <Stack direction="row" spacing={0.5} sx={{ pr: 0.5 }}>
                        <IconButton size="small" onClick={() => openAddSection(mod)} aria-label="Add section" sx={{ bgcolor: 'background.paper' }}>
                          <Iconify icon="eva:plus-outline" width={18} />
                        </IconButton>
                        <IconButton size="small" onClick={() => openEditModule(mod)} aria-label="Edit module" sx={{ bgcolor: 'background.paper' }}>
                          <Iconify icon="eva:edit-2-fill" width={18} />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteModule(mod)} color="error" aria-label="Delete module" sx={{ bgcolor: 'background.paper' }}>
                          <Iconify icon="eva:trash-2-outline" width={18} />
                        </IconButton>
                      </Stack>
                    }
                    onClick={() => setExpandedModuleId(isExpanded ? null : mod.id)}
                    sx={{
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                      borderRadius: 1.5,
                      bgcolor: isExpanded ? 'background.neutral' : 'background.paper',
                      cursor: 'pointer',
                      pr: 15,
                    }}
                  >
                    <Iconify
                      icon={isExpanded ? 'eva:chevron-up-fill' : 'eva:chevron-down-fill'}
                      width={20}
                      sx={{ mr: 1 }}
                    />
                    <ListItemText
                      primary={`${index + 1}. ${mod.title}`}
                      secondary={sections.length > 0 ? `${sections.length} section(s)` : 'No sections — add sections below'}
                    />
                  </ListItem>
                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <List
                      disablePadding
                      sx={{
                        pl: 3,
                        pr: 1,
                        py: 1,
                        mt: 0.5,
                        borderLeft: (theme) => `2px solid ${theme.palette.divider}`,
                      }}
                    >
                      {sections.length === 0 ? (
                        <ListItem sx={{ py: 1 }}>
                          <Button
                            size="small"
                            startIcon={<Iconify icon="eva:plus-fill" width={16} />}
                            onClick={(e) => { e.stopPropagation(); openAddSection(mod); }}
                          >
                            Add first section
                          </Button>
                        </ListItem>
                      ) : (
                        sections.map((sec, secIndex) => (
                          <ListItem
                            key={sec.id}
                            secondaryAction={
                              <Stack direction="row" spacing={0.5} sx={{ pr: 0.5 }}>
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); openEditSection(mod, sec); }} aria-label="Edit section" sx={{ bgcolor: 'background.paper' }}>
                                  <Iconify icon="eva:edit-2-fill" width={16} />
                                </IconButton>
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteSection(sec); }} color="error" aria-label="Delete section" sx={{ bgcolor: 'background.paper' }}>
                                  <Iconify icon="eva:trash-2-outline" width={16} />
                                </IconButton>
                              </Stack>
                            }
                            sx={{
                              border: (theme) => `1px solid ${theme.palette.divider}`,
                              borderRadius: 1.25,
                              bgcolor: 'background.neutral',
                              pl: 2,
                              py: 1,
                              mb: 0.5,
                              pr: 13,
                            }}
                          >
                            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                              <Box
                                sx={{
                                  width: 96,
                                  height: 56,
                                  flexShrink: 0,
                                  borderRadius: 1,
                                  overflow: 'hidden',
                                  bgcolor: 'common.black',
                                  border: (theme) => `1px solid ${theme.palette.divider}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPreview(sec);
                                }}
                              >
                                {sec.videoUrl
                                && !getYouTubeEmbedUrl(sec.videoUrl)
                                && !isSpotlightrUrl(sec.videoUrl) ? (
                                  <Box
                                    component="video"
                                    src={sec.videoUrl}
                                    muted
                                    preload="metadata"
                                    sx={{ width: '100%', height: '100%', objectFit: 'contain', bgcolor: 'common.black' }}
                                  />
                                ) : sec.videoUrl
                                && (getYouTubeEmbedUrl(sec.videoUrl) || isSpotlightrUrl(sec.videoUrl)) ? (
                                  <Iconify icon="solar:video-frame-bold" width={22} sx={{ color: 'common.white' }} />
                                ) : Array.isArray(sec.images) && sec.images[0] ? (
                                  <Box
                                    component="img"
                                    src={sec.images[0]}
                                    alt=""
                                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                ) : Array.isArray(sec.attachments) && sec.attachments.length > 0 ? (
                                  <Iconify icon="solar:document-bold" width={22} sx={{ color: 'common.white' }} />
                                ) : (
                                  <Iconify icon="solar:document-text-bold" width={22} sx={{ color: 'common.white' }} />
                                )}
                              </Box>

                              <ListItemText
                                primary={`${secIndex + 1}. ${sec.title}`}
                                secondary={[
                                  sec.subtitle ? sec.subtitle : null,
                                  sec.videoUrl
                                    ? [
                                        'Video section',
                                        sec.durationTime && `duration ${sec.durationTime}`,
                                      ]
                                        .filter(Boolean)
                                        .join(' ')
                                    : Array.isArray(sec.images) && sec.images.length > 0
                                      ? `Image section • ${sec.images.length} image(s)`
                                      : Array.isArray(sec.attachments) && sec.attachments.length > 0
                                        ? `Files section • ${sec.attachments.length} file(s)`
                                        : sec.content
                                          ? 'Text content section'
                                          : 'No media',
                                  Array.isArray(sec.learningMaterials) && sec.learningMaterials.length > 0
                                    ? `${sec.learningMaterials.length} learning material(s)`
                                    : null,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                                sx={{ my: 0 }}
                              />
                            </Stack>
                          </ListItem>
                        ))
                      )}
                      {sections.length > 0 && (
                        <ListItem sx={{ py: 0.5 }}>
                          <Button
                            size="small"
                            startIcon={<Iconify icon="eva:plus-fill" width={16} />}
                            onClick={(e) => { e.stopPropagation(); openAddSection(mod); }}
                          >
                            Add section
                          </Button>
                        </ListItem>
                      )}
                    </List>
                  </Collapse>
                </Box>
              );
            })}
          </List>
        )}
      </Card>

      <Drawer
        anchor="right"
        open={moduleDialogOpen}
        onClose={closeModuleDialog}
        PaperProps={{
          sx: {
            width: { xs: 1, sm: 440 },
            maxWidth: '100%',
            p: 0,
          },
        }}
      >
        <Stack sx={{ height: 1 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 2.5, py: 2, borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}
          >
            <Typography variant="h6">
              {editingModule ? 'Edit module' : 'Add module'}
            </Typography>
            <IconButton onClick={closeModuleDialog} aria-label="Close add module drawer">
              <Iconify icon="solar:close-circle-bold" width={22} />
            </IconButton>
          </Stack>

          <Stack spacing={2} sx={{ p: 2.5, flexGrow: 1 }}>
            <TextField
              label="Title"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Introduction, Detecting Financial Deception"
              fullWidth
            />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Description (optional)
              </Typography>
              <Editor
                value={formDescription}
                onChange={setFormDescription}
                placeholder="Module notes for learners..."
                editable
                onUploadImage={handleSectionContentMediaUpload}
                slotProps={{
                  wrap: {
                    sx: {
                      minHeight: 160,
                      borderRadius: 1,
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                    },
                  },
                }}
              />
            </Box>
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            justifyContent="flex-end"
            sx={{ px: 2.5, py: 2, borderTop: (theme) => `1px solid ${theme.palette.divider}` }}
          >
            <Button onClick={closeModuleDialog}>Cancel</Button>
            <Button variant="contained" onClick={handleSaveModule} disabled={saving}>
              {saving ? 'Saving...' : editingModule ? 'Update' : 'Add'}
            </Button>
          </Stack>
        </Stack>
      </Drawer>

      <Drawer
        anchor="right"
        open={sectionDialogOpen}
        onClose={closeSectionDialog}
        PaperProps={{
          sx: {
            width: { xs: 1, sm: 760 },
            maxWidth: '100%',
            p: 0,
          },
        }}
      >
        <Stack sx={{ height: 1 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 2.5, py: 2, borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}
          >
            <Typography variant="h6">{editingSection ? 'Edit section' : 'Add section'}</Typography>
            <IconButton onClick={closeSectionDialog} aria-label="Close add section drawer">
              <Iconify icon="solar:close-circle-bold" width={22} />
            </IconButton>
          </Stack>

          <Stack spacing={2} sx={{ p: 2.5, flexGrow: 1, overflowY: 'auto' }}>
            <TextField
              label="Section title"
              required
              value={sectionTitle}
              onChange={(e) => setSectionTitle(e.target.value)}
              placeholder="e.g. Occupational Fraud and Common Fraud Schemes"
              fullWidth
            />
            <TextField
              label="Subtitle (optional)"
              value={sectionSubtitle}
              onChange={(e) => setSectionSubtitle(e.target.value)}
              placeholder="Short line under the section title"
              fullWidth
            />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Learning materials (optional)
              </Typography>
              <Upload
                multiple
                value={sectionLearningMaterials}
                showViewButton
                onDrop={(acceptedFiles) => {
                  if (acceptedFiles?.length) {
                    setSectionLearningMaterials((prev) => [...prev, ...acceptedFiles]);
                  }
                }}
                onRemove={(item) =>
                  setSectionLearningMaterials((prev) => prev.filter((i) => i !== item))
                }
                accept={SECTION_LEARNING_MATERIAL_ACCEPT}
                maxSize={52428800}
                helperText="PDF, Word, Excel, PowerPoint, CSV, or TXT — uploaded when you save (max 50MB each)"
              />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Section media — choose one
              </Typography>
              <ToggleButtonGroup
                value={sectionMediaType}
                exclusive
                onChange={(_, value) => value != null && setSectionMediaType(value)}
                size="small"
                sx={{ mb: 2 }}
              >
                <ToggleButton value="video" aria-label="Video URL">
                  <Iconify icon="solar:video-bold" width={18} sx={{ mr: 0.5 }} />
                  Video URL
                </ToggleButton>
                <ToggleButton value="content" aria-label="Text content">
                  <Iconify icon="solar:document-text-bold" width={18} sx={{ mr: 0.5 }} />
                  Text content
                </ToggleButton>
                <ToggleButton value="images" aria-label="Images">
                  <Iconify icon="solar:gallery-bold" width={18} sx={{ mr: 0.5 }} />
                  Images
                </ToggleButton>
                <ToggleButton value="files" aria-label="Files">
                  <Iconify icon="solar:document-bold" width={18} sx={{ mr: 0.5 }} />
                  Files
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
            {sectionMediaType === 'video' && (
              <>
                {editingSection && (sectionVideoPreviewUrl || sectionVideoUrl.trim()) && (
                  <Stack direction="row" justifyContent="flex-end">
                    <Button
                      color="error"
                      onClick={() => {
                        setSectionVideoFile(null);
                        setSectionVideoPreviewUrl('');
                        setSectionVideoUrl('');
                      }}
                    >
                      Remove video
                    </Button>
                  </Stack>
                )}
                {(sectionVideoPreviewUrl || sectionVideoUrl.trim()) && (
                  <Box
                    sx={{
                      position: 'relative',
                      borderRadius: 1,
                      overflow: 'hidden',
                      bgcolor: 'common.black',
                      width: '100%',
                      pt: '56.25%',
                      maxHeight: 460,
                    }}
                  >
                    {sectionVideoPreviewUrl ? (
                      <Box
                        component="video"
                        src={sectionVideoPreviewUrl}
                        controls
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          bgcolor: 'common.black',
                        }}
                      />
                    ) : getYouTubeEmbedUrl(sectionVideoUrl.trim()) ? (
                      <Box sx={{ position: 'absolute', inset: 0 }}>
                        <iframe
                          title="Section video preview"
                          src={getYouTubeEmbedUrl(sectionVideoUrl.trim())}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                          }}
                        />
                      </Box>
                    ) : isSpotlightrUrl(sectionVideoUrl.trim()) ? (
                      <Box sx={{ position: 'absolute', inset: 0 }}>
                        <SpotlightrVideoIframe url={sectionVideoUrl.trim()} title="Section video preview" />
                      </Box>
                    ) : (sectionVideoUrl.trim().includes('youtube') || sectionVideoUrl.trim().includes('youtu.be')) ? (
                      <Stack
                        alignItems="center"
                        justifyContent="center"
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          px: 2,
                          bgcolor: 'grey.900',
                        }}
                      >
                        <Typography variant="body2" sx={{ color: 'common.white', textAlign: 'center' }}>
                          Could not preview this YouTube link. Use format:
                          {' '}
                          https://www.youtube.com/watch?v=VIDEO_ID
                        </Typography>
                      </Stack>
                    ) : (
                      <Box
                        component="video"
                        src={sectionVideoUrl.trim()}
                        controls
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          bgcolor: 'common.black',
                        }}
                      />
                    )}
                  </Box>
                )}
                <TextField
                  label="Video URL"
                  value={sectionVideoUrl}
                  onChange={(e) => {
                    const next = e.target.value;
                    setSectionVideoUrl(next);
                    if (next.trim()) {
                      setSectionVideoFile(null);
                    }
                  }}
                  placeholder="YouTube link, Spotlightr watch link, or leave empty to upload a file"
                  helperText={
                    sectionVideoUrl.trim()
                      ? {
                          youtube: 'YouTube link — plays in the course player with progress tracking.',
                          spotlightr: 'Spotlightr link — plays in the embedded Spotlightr player.',
                          native: 'Direct video URL — plays as MP4 in the course player.',
                        }[getVideoSourceKind(sectionVideoUrl)] || 'Video URL'
                      : 'Paste a YouTube or Spotlightr watch URL, or upload a video file below (uploads go to Spotlightr when configured).'
                  }
                  disabled={Boolean(editingSection && sectionVideoPreviewUrl)}
                  fullWidth
                />
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    border: (theme) => `1px dashed ${theme.palette.divider}`,
                    bgcolor: 'background.neutral',
                  }}
                >
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ sm: 'center' }}>
                    <Button variant="outlined" component="label">
                      {sectionVideoFile ? 'Replace video' : 'Upload video file'}
                      <input
                        hidden
                        type="file"
                        accept=".mp4,.webm,.mov,.avi,.mkv,video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            setSectionVideoFile(file);
                            setSectionVideoUrl('');
                          }
                          event.target.value = '';
                        }}
                      />
                    </Button>
                    <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 0 }} noWrap>
                      {sectionVideoFile ? sectionVideoFile.name : 'No video selected'}
                    </Typography>
                    {sectionVideoFile && (
                      <Button color="error" onClick={() => setSectionVideoFile(null)}>
                        Remove
                      </Button>
                    )}
                  </Stack>
                  <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
                    Optional. Supported: mp4, webm, mov, avi, mkv (max 20GB).
                  </Typography>
                  {detectingVideoDuration && (
                    <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: 'primary.main' }}>
                      Detecting video duration...
                    </Typography>
                  )}
                  {!detectingVideoDuration && detectedVideoDurationSeconds != null && (
                    <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: 'success.main' }}>
                      Detected duration: {formatDurationLabel(detectedVideoDurationSeconds)}
                    </Typography>
                  )}
                  {!detectingVideoDuration && videoDurationError && (
                    <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: 'warning.main' }}>
                      {videoDurationError}
                    </Typography>
                  )}
                </Box>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    bgcolor: 'background.neutral',
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2">
                      Watchtime
                    </Typography>
                    <FormControlLabel
                      sx={{ mr: 0 }}
                      control={(
                        <Switch
                          size="small"
                          checked={customWatchtimeEnabled}
                          onChange={(event) => {
                            const enabled = event.target.checked;
                            setCustomWatchtimeEnabled(enabled);
                            if (!enabled && detectedVideoDurationSeconds != null) {
                              const auto = parseWatchtimeParts(formatDurationLabel(detectedVideoDurationSeconds));
                              setSectionWatchMinutes(auto.minutes);
                              setSectionWatchSeconds(auto.seconds);
                            }
                          }}
                        />
                      )}
                      label="Customize"
                    />
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      label="Minutes"
                      value={sectionWatchMinutes}
                      onChange={(e) => {
                        const next = e.target.value.replace(/\D/g, '').slice(0, 3);
                        setSectionWatchMinutes(next);
                        if (!customWatchtimeEnabled) setCustomWatchtimeEnabled(true);
                      }}
                      placeholder="00"
                      inputProps={{ inputMode: 'numeric' }}
                      disabled={!customWatchtimeEnabled}
                      sx={{ maxWidth: 140 }}
                    />
                    <Typography variant="h5" sx={{ color: 'text.secondary', mt: 0.5 }}>
                      :
                    </Typography>
                    <TextField
                      label="Seconds"
                      value={sectionWatchSeconds}
                      onChange={(e) => {
                        const next = e.target.value.replace(/\D/g, '').slice(0, 2);
                        if (next === '' || Number(next) <= 59) {
                          setSectionWatchSeconds(next);
                          if (!customWatchtimeEnabled) setCustomWatchtimeEnabled(true);
                        }
                      }}
                      placeholder="00"
                      inputProps={{ inputMode: 'numeric' }}
                      disabled={!customWatchtimeEnabled}
                      sx={{ maxWidth: 140 }}
                    />
                  </Stack>
                  <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
                    {customWatchtimeEnabled
                      ? 'Custom watchtime. Next lesson stays locked until this watchtime is completed.'
                      : 'Auto mode uses detected video duration. Turn on Customize to override manually.'}
                  </Typography>
                  {editingSection?.durationTime && detectedVideoDurationSeconds == null && !detectingVideoDuration && (
                    <Typography variant="caption" sx={{ mt: 0.75, display: 'block', color: 'text.secondary' }}>
                      Saved video duration: {editingSection.durationTime}
                    </Typography>
                  )}
                </Box>
              </>
            )}
            {sectionMediaType === 'content' && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Rich text content for this section
                </Typography>
                <Editor
                  value={sectionContent}
                  onChange={setSectionContent}
                  placeholder="Add section content with the editor..."
                  editable
                  onUploadImage={handleSectionContentMediaUpload}
                  slotProps={{ wrap: { sx: { minHeight: 200 } } }}
                />
              </Box>
            )}
            {sectionMediaType === 'images' && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Upload multiple images for this section
                </Typography>
                <Upload
                  multiple
                  thumbnail
                  value={sectionImages}
                  onDrop={(acceptedFiles) => {
                    if (acceptedFiles?.length) {
                      setSectionImages((prev) => [...prev, ...acceptedFiles]);
                    }
                  }}
                  onRemove={(item) => setSectionImages((prev) => prev.filter((i) => i !== item))}
                  accept={{ 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] }}
                  maxSize={52428800}
                  helperText="Images are uploaded to local storage when you click Add or Update (max 50MB each)"
                />
              </Box>
            )}
            {sectionMediaType === 'files' && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Upload section files (PDF only)
                </Typography>
                <Upload
                  multiple
                  value={sectionFiles}
                  showViewButton
                  onDrop={(acceptedFiles) => {
                    if (acceptedFiles?.length) {
                      setSectionFiles((prev) => [...prev, ...acceptedFiles]);
                    }
                  }}
                  onRemove={(item) => setSectionFiles((prev) => prev.filter((i) => i !== item))}
                  accept={{ 'application/pdf': ['.pdf'] }}
                  maxSize={52428800}
                  helperText="Files upload when you click Add/Update (max 50MB each)"
                />
              </Box>
            )}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Description (optional)
              </Typography>
              <Editor
                value={sectionDescription}
                onChange={setSectionDescription}
                placeholder="Lesson notes shown to learners..."
                editable
                onUploadImage={handleSectionContentMediaUpload}
                slotProps={{
                  wrap: {
                    sx: {
                      minHeight: 180,
                      borderRadius: 1,
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                    },
                  },
                }}
              />
            </Box>
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            justifyContent="flex-end"
            sx={{ px: 2.5, py: 2, borderTop: (theme) => `1px solid ${theme.palette.divider}` }}
          >
            <Button onClick={closeSectionDialog}>Cancel</Button>
            <Button variant="contained" onClick={handleSaveSection} disabled={sectionSaving}>
              {sectionSaving ? 'Saving...' : editingSection ? 'Update' : 'Add'}
            </Button>
          </Stack>
        </Stack>
      </Drawer>

      <SectionPreviewDialog open={previewOpen} onClose={closePreview} section={previewSection} />

      <Dialog
        open={deleteConfirmOpen}
        onClose={closeDeleteConfirm}
        maxWidth="xs"
        fullWidth
        disableEscapeKeyDown={deleteInProgress}
      >
        <DialogTitle>{deleteConfirmTitle}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {deleteConfirmMessage}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDeleteConfirm} disabled={deleteInProgress}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            disabled={deleteInProgress}
            startIcon={deleteInProgress ? null : <Iconify icon="eva:trash-2-outline" width={18} />}
          >
            {deleteInProgress ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
