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
  MarkerType,
  MiniMap,
  Panel,
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
const FLOW_DEFAULT_NODES = [];
const FLOW_DEFAULT_EDGES = [];
const DAGRE_NODE_WIDTH = 180;
const DAGRE_NODE_HEIGHT = 60;

// ----------------------------------------------------------------------

export function WorkflowNewEditForm({ currentWorkflow, onCancel }) {
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

  const methods = useForm({
    mode: 'onTouched',
    reValidateMode: 'onBlur',
    shouldFocusError: true,
    resolver: zodResolver(NewWorkflowSchema),
    defaultValues,
  });

  const { reset, setValue, watch, handleSubmit } = methods;

  useEffect(() => {
    reset(defaultValues);
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
  }, [currentWorkflow, defaultValues, reset, setFlowEdges, setFlowNodes]);

  const isSubmitting = isEdit ? updating : creating;

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
        toast.success('AI resource updated successfully!');
      } else {
        await dispatch(
          createWorkflow({
            workflowData,
            imageFile,
          })
        ).unwrap();
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

              <Box>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  justifyContent="space-between"
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                  sx={{ mb: 1.5 }}
                >
                  <Typography variant="subtitle2">Workflow Builder (React Flow)</Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    <Tooltip title="Add Node">
                      <IconButton size="small" color="primary" onClick={handleAddFlowStep}>
                        <Iconify icon="solar:add-circle-bold" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Add Group">
                      <IconButton size="small" color="primary" onClick={handleAddGroup}>
                        <Iconify icon="solar:widget-3-bold" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Add Node in Group">
                      <IconButton size="small" color="primary" onClick={handleAddNodeInGroup}>
                        <Iconify icon="solar:siderbar-bold" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Duplicate Selected Node">
                      <span>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={handleDuplicateSelectedNode}
                          disabled={!selectedNodeId}
                        >
                          <Iconify icon="solar:copy-bold" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Remove Selected Node">
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={handleRemoveSelectedNode}
                          disabled={!selectedNodeId}
                        >
                          <Iconify icon="solar:trash-bin-trash-bold" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Add Relation">
                      <IconButton size="small" color="primary" onClick={handleAddRelation}>
                        <Iconify icon="solar:link-bold" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove Selected Relation">
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={handleRemoveSelectedRelation}
                          disabled={!selectedEdgeId}
                        >
                          <Iconify icon="solar:link-broken-bold" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Zoom In">
                      <IconButton size="small" onClick={handleZoomIn}>
                        <Iconify icon="solar:magnifer-zoom-in-bold" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Zoom Out">
                      <IconButton size="small" onClick={handleZoomOut}>
                        <Iconify icon="solar:magnifer-zoom-out-bold" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Fit View">
                      <IconButton size="small" onClick={handleFitView}>
                        <Iconify icon="solar:minimize-square-3-bold" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Auto Layout Top-Bottom">
                      <IconButton size="small" onClick={() => handleAutoLayout('TB')}>
                        <Iconify icon="solar:sort-by-time-bold" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Auto Layout Left-Right">
                      <IconButton size="small" onClick={() => handleAutoLayout('LR')}>
                        <Iconify icon="solar:hierarchy-square-2-bold" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={nodesDraggable ? 'Lock Node Dragging' : 'Unlock Node Dragging'}>
                      <IconButton size="small" onClick={() => setNodesDraggable((prev) => !prev)}>
                        <Iconify
                          icon={nodesDraggable ? 'solar:lock-keyhole-bold' : 'solar:lock-keyhole-unlocked-bold'}
                        />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Copy Flow JSON">
                      <IconButton size="small" onClick={handleCopyFlowJson}>
                        <Iconify icon="solar:code-bold" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Reset Flow">
                      <IconButton size="small" color="inherit" onClick={handleResetFlow}>
                        <Iconify icon="solar:refresh-bold" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Generate Steps in Description">
                      <IconButton size="small" color="success" onClick={handleApplyFlowToDescription}>
                        <Iconify icon="solar:document-add-bold" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
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
                    nodes={flowNodes}
                    edges={flowEdges}
                    onNodesChange={onFlowNodesChange}
                    onEdgesChange={onFlowEdgesChange}
                    onConnect={handleConnect}
                    onInit={setReactFlowInstance}
                    onNodeClick={(event, node) => {
                      setSelectedNodeId(node.id);
                    }}
                    onEdgeClick={(event, edge) => {
                      setSelectedEdgeId(edge.id);
                    }}
                    nodesDraggable={nodesDraggable}
                    nodesConnectable={nodesConnectable}
                    panOnScroll={panOnScroll}
                    selectionOnDrag={selectionOnDrag}
                    snapToGrid={snapToGrid}
                    snapGrid={[16, 16]}
                    deleteKeyCode={['Backspace', 'Delete']}
                    fitView
                  >
                    <Panel position="top-right">
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant={newNodeType === 'default' ? 'contained' : 'outlined'}
                          onClick={() => setNewNodeType('default')}
                        >
                          N
                        </Button>
                        <Button
                          size="small"
                          variant={newNodeType === 'input' ? 'contained' : 'outlined'}
                          onClick={() => setNewNodeType('input')}
                        >
                          In
                        </Button>
                        <Button
                          size="small"
                          variant={newNodeType === 'output' ? 'contained' : 'outlined'}
                          onClick={() => setNewNodeType('output')}
                        >
                          Out
                        </Button>
                        <Button
                          size="small"
                          variant={newEdgeType === 'smoothstep' ? 'contained' : 'outlined'}
                          onClick={() => setNewEdgeType((prev) => (prev === 'smoothstep' ? 'default' : 'smoothstep'))}
                        >
                          E
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() =>
                            setBgVariant((prev) =>
                              prev === BackgroundVariant.Dots
                                ? BackgroundVariant.Lines
                                : prev === BackgroundVariant.Lines
                                  ? BackgroundVariant.Cross
                                  : BackgroundVariant.Dots
                            )
                          }
                        >
                          Bg
                        </Button>
                        <Button
                          size="small"
                          variant={nodesConnectable ? 'contained' : 'outlined'}
                          onClick={() => setNodesConnectable((prev) => !prev)}
                        >
                          C
                        </Button>
                        <Button
                          size="small"
                          variant={panOnScroll ? 'contained' : 'outlined'}
                          onClick={() => setPanOnScroll((prev) => !prev)}
                        >
                          P
                        </Button>
                        <Button
                          size="small"
                          variant={selectionOnDrag ? 'contained' : 'outlined'}
                          onClick={() => setSelectionOnDrag((prev) => !prev)}
                        >
                          S
                        </Button>
                        <Button
                          size="small"
                          variant={snapToGrid ? 'contained' : 'outlined'}
                          onClick={() => setSnapToGrid((prev) => !prev)}
                        >
                          G
                        </Button>
                      </Stack>
                    </Panel>
                    <MiniMap />
                    <Controls />
                    <Background gap={14} variant={bgVariant} />
                  </ReactFlow>
                </Box>
              </Box>

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
