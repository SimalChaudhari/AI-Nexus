import { z as zod } from 'zod';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import ReactFlow, {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import { alpha, useTheme } from '@mui/material/styles';

import { CONFIG } from 'src/config-global';
import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Iconify } from 'src/components/iconify';
import { SvgColor } from 'src/components/svg-color';
import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { Upload } from 'src/components/upload';
import { createWorkflow, updateWorkflow } from 'src/store/slices/workflowSlice';
import { fetchLabels } from 'src/store/slices/labelSlice';
import { fetchTags } from 'src/store/slices/tagSlice';
import { isEffectivelyEmptyHtml } from 'src/utils/html-plain-text';
import { workflowService } from 'src/services/workflow.service';

// ----------------------------------------------------------------------

export const NewWorkflowSchema = zod.object({
  title: zod
    .string()
    .trim()
    .min(1, { message: 'Title is required!' })
    .max(200, { message: 'Title must be 200 characters or less' }),
  description: zod
    .string()
    .optional()
    .refine((val) => !val || val.length <= 50000, { message: 'Description is too long' }),
  labelId: zod.string().optional().nullable(),
  tags: zod.array(zod.any()).optional(),
  tagIds: zod.array(zod.string()).optional(),
});

// ----------------------------------------------------------------------
const CREATE_FORM_DRAFT_KEY = 'aiNexus.workflow.createFormDraft';

const readCreateFormDraft = () => {
  try {
    const raw = sessionStorage.getItem(CREATE_FORM_DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return null;
    return {
      title: typeof d.title === 'string' ? d.title : '',
      description: typeof d.description === 'string' ? d.description : '',
      labelId: d.labelId ?? null,
      tagIds: Array.isArray(d.tagIds) ? d.tagIds : [],
      tags: Array.isArray(d.tags) ? d.tags : [],
    };
  } catch {
    return null;
  }
};

const writeCreateFormDraft = (values) => {
  try {
    sessionStorage.setItem(
      CREATE_FORM_DRAFT_KEY,
      JSON.stringify({
        title: values?.title ?? '',
        description: values?.description ?? '',
        labelId: values?.labelId ?? null,
        tagIds: Array.isArray(values?.tagIds) ? values.tagIds : [],
        tags: Array.isArray(values?.tags) ? values.tags : [],
      })
    );
  } catch {
    // ignore quota / private mode
  }
};

const editFormDraftStorageKey = (id) => `aiNexus.workflow.editFormDraft.${id}`;

const readEditFormDraft = (id) => {
  if (!id) return null;
  try {
    const raw = sessionStorage.getItem(editFormDraftStorageKey(id));
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return null;
    return {
      title: typeof d.title === 'string' ? d.title : '',
      description: typeof d.description === 'string' ? d.description : '',
      labelId: d.labelId ?? null,
      tagIds: Array.isArray(d.tagIds) ? d.tagIds : [],
      tags: Array.isArray(d.tags) ? d.tags : [],
    };
  } catch {
    return null;
  }
};

const writeEditFormDraft = (id, values) => {
  if (!id) return;
  try {
    sessionStorage.setItem(
      editFormDraftStorageKey(id),
      JSON.stringify({
        title: values?.title ?? '',
        description: values?.description ?? '',
        labelId: values?.labelId ?? null,
        tagIds: Array.isArray(values?.tagIds) ? values.tagIds : [],
        tags: Array.isArray(values?.tags) ? values.tags : [],
      })
    );
  } catch {
    // ignore
  }
};

const clearEditFormDraft = (id) => {
  if (!id) return;
  try {
    sessionStorage.removeItem(editFormDraftStorageKey(id));
  } catch {
    // ignore
  }
};

const FLOW_DEFAULT_NODES = [];
const FLOW_DEFAULT_EDGES = [];
const DAGRE_NODE_WIDTH = 180;
const DAGRE_NODE_HEIGHT = 60;
const nodeStyleMap = {
  trigger: { borderColor: '#1976d2', chipColor: 'primary', icon: 'solar:play-circle-bold' },
  send_email: { borderColor: '#2e7d32', chipColor: 'success', icon: 'solar:letter-bold' },
  condition: { borderColor: '#ed6c02', chipColor: 'warning', icon: 'solar:checklist-minimalistic-bold' },
  delay: { borderColor: '#7b1fa2', chipColor: 'secondary', icon: 'solar:clock-circle-bold' },
  http_request: { borderColor: '#00838f', chipColor: 'info', icon: 'solar:global-bold' },
  default: { borderColor: '#546e7a', chipColor: 'default', icon: 'solar:widget-4-bold' },
};

const resolveNodeKind = (node) => {
  const kind = String(node?.data?.nodeKind || '').toLowerCase();
  if (kind) return kind;
  const triggerType = String(node?.data?.triggerType || '').toLowerCase();
  if (triggerType) return 'trigger';
  const actionType = String(node?.data?.actionType || '').toLowerCase();
  if (actionType) return actionType;
  const label = String(node?.data?.label || '').toLowerCase();
  if (label.includes('condition')) return 'condition';
  if (label.includes('email')) return 'send_email';
  if (label.includes('delay')) return 'delay';
  if (label.includes('http')) return 'http_request';
  if (label.includes('trigger')) return 'trigger';
  return 'default';
};

function WorkflowPreviewNodeCard({ data, selected }) {
  const kind = String(data?.nodeKind || 'default');
  const conf = nodeStyleMap[kind] || nodeStyleMap.default;
  const isConditionNode = kind === 'condition';

  return (
    <Box
      sx={{
        minWidth: isConditionNode ? 130 : 210,
        width: isConditionNode ? 130 : 'auto',
        maxWidth: isConditionNode ? 130 : 250,
        minHeight: isConditionNode ? 130 : 90,
        border: `2px solid ${conf.borderColor}`,
        borderRadius: isConditionNode ? '50%' : 1.5,
        bgcolor: 'background.paper',
        p: isConditionNode ? 1 : 1.2,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        boxShadow: selected ? '0 0 0 4px rgba(25,118,210,0.12)' : '0 4px 12px rgba(0,0,0,0.08)',
      }}
    >
      <Handle type="target" position={Position.Left} />
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.8 }}>
        <Iconify icon={conf.icon} width={15} />
        <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
          {data?.label || 'Node'}
        </Typography>
      </Stack>
      <Stack direction="row" spacing={0.4} flexWrap="wrap" justifyContent="center">
        <Chip size="small" label={kind} color={conf.chipColor} variant="soft" sx={{ height: 18 }} />
      </Stack>
      {data?.triggerType && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.4, color: 'text.secondary' }}>
          Trigger: {data.triggerType}
        </Typography>
      )}
      {data?.actionType && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.2, color: 'text.secondary' }}>
          Action: {data.actionType}
        </Typography>
      )}
      <Handle type="source" position={Position.Right} />
    </Box>
  );
}

const WORKFLOW_BUILDER_BUTTON_SX = {
  fontWeight: 600,
  px: 2.5,
  py: 1,
  minHeight: 40,
  whiteSpace: 'nowrap',
};

function WorkflowBuilderEntryButton({ mode, onCreateClick, onEditClick }) {
  const startIcon = <Iconify icon="solar:widget-4-bold" width={20} />;

  if (mode === 'edit') {
    return (
      <Button
        type="button"
        variant="contained"
        color="primary"
        size="medium"
        startIcon={startIcon}
        sx={WORKFLOW_BUILDER_BUTTON_SX}
        onClick={onEditClick}
      >
        Edit / Connect Workflow
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="contained"
      color="primary"
      size="medium"
      startIcon={startIcon}
      sx={WORKFLOW_BUILDER_BUTTON_SX}
      onClick={onCreateClick}
    >
      Create / Connect Workflow
    </Button>
  );
}

// ----------------------------------------------------------------------

export function WorkflowNewEditForm({
  currentWorkflow,
  onCancel,
  showFlowBuilder = true,
  externalFlowData = null,
}) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const router = useRouter();
  const isEdit = Boolean(currentWorkflow);

  const { labels, loading: labelsLoading } = useSelector((state) => state.labels);
  const { tags, loading: tagsLoading } = useSelector((state) => state.tags);
  const { creating, updating } = useSelector((state) => state.workflows);

  const [previewImage, setPreviewImage] = useState(currentWorkflow?.image || null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [flowNodes, setFlowNodes, onFlowNodesChange] = useNodesState(FLOW_DEFAULT_NODES);
  const [flowEdges, setFlowEdges, onFlowEdgesChange] = useEdgesState(FLOW_DEFAULT_EDGES);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [nodesDraggable, setNodesDraggable] = useState(true);
  const [nodesConnectable, setNodesConnectable] = useState(true);
  const [panOnScroll, setPanOnScroll] = useState(true);
  const [selectionOnDrag, setSelectionOnDrag] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [bgVariant, setBgVariant] = useState(BackgroundVariant.Dots);
  const [newNodeType, setNewNodeType] = useState('default');
  const [newEdgeType, setNewEdgeType] = useState('default');
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [selectedEdgeId, setSelectedEdgeId] = useState('');

  useEffect(() => {
    dispatch(fetchLabels());
    dispatch(fetchTags());
  }, [dispatch]);

  const defaultValues = useMemo(
    () => ({
      title: currentWorkflow?.title || '',
      description: currentWorkflow?.description || '',
      labelId: currentWorkflow?.labelId || currentWorkflow?.label?.id || null,
      tagIds: currentWorkflow?.tagIds || currentWorkflow?.tags?.map((tag) => tag.id) || [],
      tags:
        currentWorkflow?.tags?.map((tag) => ({
          id: tag.id,
          label: tag.title,
          title: tag.title,
        })) || [],
    }),
    [currentWorkflow]
  );

  const fullBuilderHref = useMemo(
    () =>
      currentWorkflow?.id
        ? `${paths.admin.workflow.builder}?from=edit&id=${encodeURIComponent(currentWorkflow.id)}`
        : paths.admin.workflow.builder,
    [currentWorkflow?.id]
  );

  const methods = useForm({
    mode: 'onTouched',
    reValidateMode: 'onBlur',
    shouldFocusError: true,
    resolver: zodResolver(NewWorkflowSchema),
    defaultValues,
  });

  const { reset, setValue, watch, handleSubmit, getValues } = methods;

  useEffect(() => {
    if (isEdit) {
      const draft = currentWorkflow?.id ? readEditFormDraft(currentWorkflow.id) : null;
      const mergedValues = draft
        ? {
            ...defaultValues,
            title: draft.title ?? defaultValues.title,
            description: draft.description ?? defaultValues.description,
            labelId: 'labelId' in draft ? draft.labelId : defaultValues.labelId,
            tagIds: Array.isArray(draft.tagIds) ? draft.tagIds : defaultValues.tagIds,
            tags: Array.isArray(draft.tags) ? draft.tags : defaultValues.tags,
          }
        : defaultValues;
      reset(mergedValues);
      if (currentWorkflow?.id) {
        setPreviewImage(currentWorkflow.image || null);
      } else {
        setPreviewImage(null);
      }
      const savedFlowNodes = currentWorkflow?.flowData?.nodes;
      const savedFlowEdges = currentWorkflow?.flowData?.edges;
      if (Array.isArray(savedFlowNodes) && Array.isArray(savedFlowEdges) && savedFlowNodes.length > 0) {
        setFlowNodes(savedFlowNodes);
        setFlowEdges(savedFlowEdges);
      } else {
        setFlowNodes(FLOW_DEFAULT_NODES);
        setFlowEdges(FLOW_DEFAULT_EDGES);
      }
      setSelectedNodeId('');
      setSelectedEdgeId('');
      setSelectedFile(null);
      return;
    }

    // Create: restore title / description / label / tags from session (survives builder round-trip)
    const draft = readCreateFormDraft();
    reset({
      ...defaultValues,
      ...(draft || {}),
    });
    setPreviewImage(null);
    setFlowNodes(FLOW_DEFAULT_NODES);
    setFlowEdges(FLOW_DEFAULT_EDGES);
    setSelectedNodeId('');
    setSelectedEdgeId('');
    setSelectedFile(null);
  }, [currentWorkflow, defaultValues, isEdit, reset, setFlowEdges, setFlowNodes]);

  const handleOpenFullBuilder = useCallback(() => {
    writeCreateFormDraft(getValues());
    router.push(`${paths.admin.workflow.builder}?from=create`);
  }, [getValues, router]);

  const handleOpenEditFullBuilder = useCallback(() => {
    if (currentWorkflow?.id) {
      writeEditFormDraft(currentWorkflow.id, getValues());
    }
    router.push(fullBuilderHref);
  }, [currentWorkflow?.id, fullBuilderHref, getValues, router]);

  useEffect(() => {
    if (
      externalFlowData &&
      Array.isArray(externalFlowData.nodes) &&
      Array.isArray(externalFlowData.edges)
    ) {
      setFlowNodes(externalFlowData.nodes);
      setFlowEdges(externalFlowData.edges);
    }
  }, [externalFlowData, setFlowEdges, setFlowNodes]);

  const isSubmitting = isEdit ? updating : creating;
  const styledFlowNodes = useMemo(() => {
    const nodeTypeByKind = {
      trigger: 'triggerNode',
      send_email: 'emailNode',
      condition: 'conditionNode',
      delay: 'delayNode',
      http_request: 'httpNode',
      default: 'genericNode',
    };

    return flowNodes.map((node, idx) => {
      const nodeKind = resolveNodeKind(node);
      return {
        ...node,
        id: String(node.id ?? idx + 1),
        type: nodeTypeByKind[nodeKind] || 'genericNode',
        data: {
          ...(node.data || {}),
          nodeKind,
        },
      };
    });
  }, [flowNodes]);

  const flowNodeTypes = useMemo(
    () => ({
      triggerNode: WorkflowPreviewNodeCard,
      emailNode: WorkflowPreviewNodeCard,
      conditionNode: WorkflowPreviewNodeCard,
      delayNode: WorkflowPreviewNodeCard,
      httpNode: WorkflowPreviewNodeCard,
      genericNode: WorkflowPreviewNodeCard,
    }),
    []
  );

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
    router.push(paths.admin.workflow.list);
  };

  const handleDropImage = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result);
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsDataURL(file);

    setSelectedFile(file);
  }, []);

  const handleDeleteImage = useCallback(async () => {
    setPreviewImage(null);
    setSelectedFile(null);

    // If editing an existing workflow, delete cover image on server as well
    if (currentWorkflow?.id) {
      try {
        await workflowService.deleteWorkflowImage(currentWorkflow.id);
        toast.success('Cover image removed');
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Failed to delete cover image');
      }
    }
  }, [currentWorkflow?.id]);

  const handleConnect = useCallback(
    (connection) => {
      setFlowEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: newEdgeType,
            markerEnd: { type: MarkerType.ArrowClosed },
            animated: newEdgeType !== 'straight',
          },
          eds
        )
      );
    },
    [newEdgeType, setFlowEdges]
  );

  const handleAddFlowStep = useCallback(() => {
    setFlowNodes((prevNodes) => {
      const maxNumericId = prevNodes.reduce((max, node) => {
        const parsed = Number(node.id);
        return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
      }, 0);
      const nextId = String(maxNumericId + 1);
      const nextNode = {
        id: nextId,
        position: { x: 30 + prevNodes.length * 180, y: 80 + (prevNodes.length % 3) * 100 },
        data: { label: `Step ${prevNodes.length + 1}` },
        type: newNodeType === 'default' ? undefined : newNodeType,
      };
      return [...prevNodes, nextNode];
    });
  }, [newNodeType, setFlowNodes]);

  const handleResetFlow = useCallback(() => {
    setFlowNodes(FLOW_DEFAULT_NODES);
    setFlowEdges(FLOW_DEFAULT_EDGES);
  }, [setFlowNodes, setFlowEdges]);

  const handleApplyFlowToDescription = useCallback(() => {
    const sortedNodes = [...flowNodes].sort((a, b) => Number(a.id) - Number(b.id));
    const html = `<p><strong>Workflow Steps:</strong></p><ol>${sortedNodes
      .map((node) => `<li>${node.data?.label || 'Step'}</li>`)
      .join('')}</ol>`;

    setValue('description', html, { shouldValidate: true, shouldDirty: true });
    toast.success('React Flow steps applied to description');
  }, [flowNodes, setValue]);

  const handleRemoveSelectedNode = useCallback(() => {
    if (!selectedNodeId) {
      toast.error('Select a node to remove');
      return;
    }
    setFlowNodes((prev) => prev.filter((node) => node.id !== selectedNodeId));
    setFlowEdges((prev) => prev.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId));
    setSelectedNodeId('');
    toast.success('Node removed');
  }, [selectedNodeId, setFlowEdges, setFlowNodes]);

  const handleAddRelation = useCallback(() => {
    if (!selectedNodeId) {
      toast.error('Select source node first');
      return;
    }
    const targetNodeId = flowNodes.find((node) => node.id !== selectedNodeId)?.id;
    if (!targetNodeId) {
      toast.error('Add another node to create relation');
      return;
    }
    const relationId = `e${selectedNodeId}-${targetNodeId}-${Date.now()}`;
    setFlowEdges((prev) => {
      const exists = prev.some((edge) => edge.source === selectedNodeId && edge.target === targetNodeId);
      if (exists) return prev;
      return [...prev, { id: relationId, source: selectedNodeId, target: targetNodeId, animated: true }];
    });
    toast.success('Relation added');
  }, [flowNodes, selectedNodeId, setFlowEdges]);

  const handleRemoveSelectedRelation = useCallback(() => {
    if (!selectedEdgeId) {
      toast.error('Select a relation to remove');
      return;
    }
    setFlowEdges((prev) => prev.filter((edge) => edge.id !== selectedEdgeId));
    setSelectedEdgeId('');
    toast.success('Relation removed');
  }, [selectedEdgeId, setFlowEdges]);

  const handleDuplicateSelectedNode = useCallback(() => {
    if (!selectedNodeId) {
      toast.error('Select a node to duplicate');
      return;
    }
    setFlowNodes((prevNodes) => {
      const selected = prevNodes.find((n) => n.id === selectedNodeId);
      if (!selected) return prevNodes;
      const maxNumericId = prevNodes.reduce((max, node) => {
        const parsed = Number(node.id);
        return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
      }, 0);
      const nextId = String(maxNumericId + 1);
      return [
        ...prevNodes,
        {
          ...selected,
          id: nextId,
          position: {
            x: Number(selected.position?.x || 0) + 40,
            y: Number(selected.position?.y || 0) + 40,
          },
          data: {
            ...selected.data,
            label: `${selected.data?.label || 'Node'} Copy`,
          },
        },
      ];
    });
    toast.success('Node duplicated');
  }, [selectedNodeId, setFlowNodes]);

  const handleCopyFlowJson = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ nodes: flowNodes, edges: flowEdges }, null, 2));
      toast.success('Flow JSON copied');
    } catch {
      toast.error('Failed to copy flow JSON');
    }
  }, [flowEdges, flowNodes]);

  const handleZoomIn = useCallback(() => {
    if (reactFlowInstance) reactFlowInstance.zoomIn();
  }, [reactFlowInstance]);

  const handleZoomOut = useCallback(() => {
    if (reactFlowInstance) reactFlowInstance.zoomOut();
  }, [reactFlowInstance]);

  const handleFitView = useCallback(() => {
    if (reactFlowInstance) reactFlowInstance.fitView({ padding: 0.2 });
  }, [reactFlowInstance]);

  const handleAutoLayout = useCallback(
    (direction = 'TB') => {
      const g = new dagre.graphlib.Graph();
      g.setDefaultEdgeLabel(() => ({}));
      g.setGraph({ rankdir: direction, ranksep: 80, nodesep: 40 });

      flowNodes.forEach((node) => g.setNode(node.id, { width: DAGRE_NODE_WIDTH, height: DAGRE_NODE_HEIGHT }));
      flowEdges.forEach((edge) => g.setEdge(edge.source, edge.target));

      dagre.layout(g);

      setFlowNodes((prev) =>
        prev.map((node) => {
          const pos = g.node(node.id);
          return pos
            ? {
                ...node,
                position: {
                  x: pos.x - DAGRE_NODE_WIDTH / 2,
                  y: pos.y - DAGRE_NODE_HEIGHT / 2,
                },
              }
            : node;
        })
      );
      setTimeout(() => handleFitView(), 0);
    },
    [flowEdges, flowNodes, handleFitView, setFlowNodes]
  );

  const handleAddGroup = useCallback(() => {
    setFlowNodes((prevNodes) => {
      const maxNumericId = prevNodes.reduce((max, node) => {
        const parsed = Number(node.id);
        return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
      }, 0);
      const nextId = String(maxNumericId + 1);
      return [
        ...prevNodes,
        {
          id: nextId,
          type: 'group',
          position: { x: 40, y: 40 },
          data: { label: `Group ${nextId}` },
          style: {
            width: 320,
            height: 220,
            borderRadius: 12,
            border: '1px dashed #94a3b8',
            background: 'rgba(148,163,184,0.12)',
          },
        },
      ];
    });
  }, [setFlowNodes]);

  const handleAddNodeInGroup = useCallback(() => {
    if (!selectedNodeId) {
      toast.error('Select a group node first');
      return;
    }
    const groupNode = flowNodes.find((n) => n.id === selectedNodeId);
    if (!groupNode || groupNode.type !== 'group') {
      toast.error('Selected node is not a group');
      return;
    }
    setFlowNodes((prevNodes) => {
      const maxNumericId = prevNodes.reduce((max, node) => {
        const parsed = Number(node.id);
        return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
      }, 0);
      const nextId = String(maxNumericId + 1);
      return [
        ...prevNodes,
        {
          id: nextId,
          parentId: selectedNodeId,
          extent: 'parent',
          position: { x: 20 + (prevNodes.length % 4) * 80, y: 30 + (prevNodes.length % 3) * 50 },
          data: { label: `Sub ${nextId}` },
        },
      ];
    });
  }, [flowNodes, selectedNodeId, setFlowNodes]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      let tagIds = [];
      const tagTitles = [];

      if (data.tags && data.tags.length > 0) {
        data.tags.forEach((tag) => {
          if (typeof tag === 'string') {
            tagTitles.push(tag.trim());
          } else if (tag.id) {
            tagIds.push(tag.id);
          }
        });
      } else if (data.tagIds && data.tagIds.length > 0) {
        tagIds = [...data.tagIds];
      }

      const workflowData = {
        title: data.title.trim(),
        description: isEffectivelyEmptyHtml(data.description || '') ? undefined : data.description,
        labelId: data.labelId || undefined,
        flowData: {
          nodes: flowNodes,
          edges: flowEdges,
        },
        tagIds: tagIds.length > 0 ? tagIds : undefined,
        tagTitles: tagTitles.length > 0 ? tagTitles : undefined,
      };

      const imageFile = selectedFile || null;

      if (currentWorkflow) {
        await dispatch(
          updateWorkflow({
            id: currentWorkflow.id,
            workflowData,
            imageFile,
          })
        ).unwrap();
        clearEditFormDraft(currentWorkflow.id);
        toast.success('AI resource updated successfully!');
      } else {
        await dispatch(
          createWorkflow({
            workflowData,
            imageFile,
          })
        ).unwrap();
        try {
          sessionStorage.removeItem(CREATE_FORM_DRAFT_KEY);
        } catch {
          // ignore
        }
        toast.success('AI resource created successfully!');
      }
      router.push(paths.admin.workflow.list);
    } catch (error) {
      const errorMessage = error || 'Failed to save AI resource';
      toast.error(errorMessage);
      console.error('Error saving AI resource:', error);
    }
  });

  const labelOptions = useMemo(
    () =>
      labels.map((label) => ({
        id: label.id,
        label: label.name || label.title,
      })),
    [labels]
  );

  const tagOptions = useMemo(
    () =>
      tags.map((tag) => ({
        id: tag.id,
        label: tag.title,
      })),
    [tags]
  );

  const selectedLabel = useMemo(() => {
    const labelId = watch('labelId');
    if (!labelId) return null;
    return labelOptions.find((opt) => opt.id === labelId) || null;
  }, [watch('labelId'), labelOptions]);

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          <Card sx={cardSx}>
            <CardHeader
              title={isEdit ? 'Edit AI resource' : 'Create AI resource'}
              subheader="Title, rich description, cover image, label, and tags."
              sx={{ px: 3, pt: 3, pb: 0, alignItems: 'flex-start' }}
              action={
                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" justifyContent="flex-end">
                  {showFlowBuilder && (
                    <WorkflowBuilderEntryButton
                      mode={isEdit ? 'edit' : 'create'}
                      onCreateClick={handleOpenFullBuilder}
                      onEditClick={handleOpenEditFullBuilder}
                    />
                  )}
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
                      src={`${CONFIG.site.basePath}/assets/icons/navbar/ic-workflow.svg`}
                      sx={{ width: 28, height: 28, color: 'primary.main' }}
                    />
                  </Box>
                </Stack>
              }
            />
            <Divider sx={{ mx: 3, my: 2 }} />
            <Stack spacing={3} sx={{ px: 3, pb: 3 }}>
              <Alert severity="info" icon={<Iconify icon="solar:info-circle-bold" width={22} />}>
                Use the toolbar for <strong>bold</strong>, lists, and links in the description.{' '}
                <strong>Label</strong> and <strong>at least one tag</strong> are required. Tags can be new or
                existing — press Enter to add.
              </Alert>

              <Field.Text name="title" label="Title" placeholder="e.g. Customer onboarding flow" />

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Description
                </Typography>
                <Field.Editor
                  name="description"
                  placeholder="What this resource covers, steps, and outcomes…"
                  fullItem={false}
                />
              </Box>

              {showFlowBuilder && (
                <Box>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    justifyContent="flex-start"
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                    sx={{ mb: 1.5 }}
                  >
                    <Typography variant="subtitle2">Workflow Builder (React Flow)</Typography>
                  </Stack>
                  <Box
                    sx={{
                      height: 320,
                      borderRadius: 1.5,
                      border: `1px solid ${alpha(theme.palette.grey[500], 0.2)}`,
                      overflow: 'hidden',
                    }}
                  >
                    <ReactFlow
                    nodes={styledFlowNodes}
                    edges={flowEdges}
                    nodeTypes={flowNodeTypes}
                    onInit={setReactFlowInstance}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={false}
                    panOnScroll={false}
                    panOnDrag={false}
                    zoomOnScroll={false}
                    zoomOnPinch={false}
                    zoomOnDoubleClick={false}
                    fitView
                  >
                    <MiniMap />
                    <Controls />
                    <Background gap={14} variant={bgVariant} />
                    </ReactFlow>
                  </Box>
                </Box>
              )}

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  Cover image
                </Typography>
                <Upload
                  value={selectedFile || previewImage}
                  onDrop={handleDropImage}
                  onDelete={handleDeleteImage}
                  maxSize={5 * 1024 * 1024}
                  thumbnail
                  accept={{
                    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
                  }}
                />
              </Box>

              <Field.Autocomplete
                name="labelId"
                label="Label"
                placeholder="Select label..."
                loading={labelsLoading}
                options={labelOptions}
                value={selectedLabel}
                onChange={(event, newValue) => {
                  setValue('labelId', newValue?.id || null, { shouldValidate: false });
                }}
                getOptionLabel={(option) => {
                  if (!option) return '';
                  if (typeof option === 'string') return option;
                  return option.label || '';
                }}
                isOptionEqualToValue={(option, value) => {
                  if (!option || !value) return false;
                  return option.id === value.id;
                }}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    {option.label}
                  </li>
                )}
              />

              <Field.TagsInput
                name="tags"
                label="Tags"
                placeholder="Add tag… (Enter to add; new tags are created on save)"
                options={tagOptions}
                loading={tagsLoading}
              />
            </Stack>
          </Card>
        </Grid>

        <Grid xs={12} md={4}>
          <Card
            sx={{
              ...cardSx,
              position: { md: 'sticky' },
              top: { md: 24 },
              p: 3,
            }}
          >
            <CardHeader title="Publish" subheader="Save when you’re ready." sx={{ p: 0, mb: 2 }} />
            <Stack spacing={1.5}>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                color="inherit"
                startIcon={<Iconify icon="eva:arrow-back-fill" />}
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <LoadingButton
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                loading={isSubmitting}
                startIcon={<Iconify icon={isEdit ? 'eva:checkmark-fill' : 'solar:add-circle-bold'} />}
              >
                {isEdit ? 'Save changes' : 'Create AI resource'}
              </LoadingButton>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Form>
  );
}
