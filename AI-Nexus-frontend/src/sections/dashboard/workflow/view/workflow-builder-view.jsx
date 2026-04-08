import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  addEdge,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import { useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter, useSearchParams } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { toast } from 'src/components/snackbar';
import { workflowService } from 'src/services/workflow.service';
import { updateWorkflow } from 'src/store/slices/workflowSlice';

// ----------------------------------------------------------------------
const TEMPLATE_FLOW_DRAFT_KEY = 'aiNexus.workflow.templateFlowDraft';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const nodeKinds = [
  { key: 'trigger', label: 'Trigger', type: 'input' },
  { key: 'send_email', label: 'Send Email', type: 'default' },
  { key: 'condition', label: 'Condition', type: 'default' },
  { key: 'delay', label: 'Delay', type: 'default' },
  { key: 'http_request', label: 'HTTP Request', type: 'default' },
];

const triggerOptions = [
  { value: 'manual_trigger', label: 'Manual Trigger' },
  { value: 'schedule_cron', label: 'Schedule (Cron)' },
  { value: 'webhook_received', label: 'Webhook Received' },
  { value: 'user_registered', label: 'User Registered' },
  { value: 'user_verified', label: 'User Verified' },
  { value: 'password_reset_requested', label: 'Password Reset Requested' },
  { value: 'profile_updated', label: 'Profile Updated' },
  { value: 'course_purchased', label: 'Course Purchased' },
  { value: 'course_completed', label: 'Course Completed' },
  { value: 'certificate_issued', label: 'Certificate Issued' },
  { value: 'order_refunded', label: 'Order Refunded' },
  { value: 'payment_failed', label: 'Payment Failed' },
  { value: 'cart_abandoned', label: 'Cart Abandoned' },
  { value: 'subscription_renewed', label: 'Subscription Renewed' },
  { value: 'subscription_canceled', label: 'Subscription Canceled' },
];

const getTriggerLabel = (value) =>
  triggerOptions.find((trigger) => trigger.value === value)?.label || value || 'Trigger';

const nodeStyleMap = {
  trigger: { borderColor: '#1976d2', chipColor: 'primary', icon: 'solar:play-circle-bold' },
  send_email: { borderColor: '#2e7d32', chipColor: 'success', icon: 'solar:letter-bold' },
  condition: { borderColor: '#ed6c02', chipColor: 'warning', icon: 'solar:checklist-minimalistic-bold' },
  delay: { borderColor: '#7b1fa2', chipColor: 'secondary', icon: 'solar:clock-circle-bold' },
  http_request: { borderColor: '#00838f', chipColor: 'info', icon: 'solar:global-bold' },
  default: { borderColor: '#546e7a', chipColor: 'default', icon: 'solar:widget-4-bold' },
};

const COMPACT_CHIP_SX = {
  height: 11,
  maxWidth: '100%',
  '& .MuiChip-label': { px: 0.4, fontSize: '0.48rem', lineHeight: 1 },
};

function WorkflowNodeCard({ data, selected, isDark = false }) {
  const kind = data?.nodeKind || 'default';
  const conf = nodeStyleMap[kind] || nodeStyleMap.default;
  const isConditionNode = kind === 'condition';
  const isTriggerNode = kind === 'trigger';
  const runStatus = String(data?.runStatus || 'idle');
  const activeGlow =
    runStatus === 'running'
      ? '0 0 0 1px rgba(2,136,209,0.35)'
      : runStatus === 'success'
        ? '0 0 0 1px rgba(46,125,50,0.32)'
        : runStatus === 'failed'
          ? '0 0 0 1px rgba(211,47,47,0.32)'
          : null;

  const boxLayout = isConditionNode
    ? { minWidth: 72, width: 72, maxWidth: 72, minHeight: 72, p: 0.3 }
    : { minWidth: 96, width: 'auto', maxWidth: 118, minHeight: 44, p: 0.35 };

  const sublineSx = {
    display: 'block',
    mt: 0.1,
    color: 'text.secondary',
    fontSize: '0.45rem',
    lineHeight: 1.1,
    px: 0.1,
    wordBreak: 'break-word',
  };

  return (
    <Box
      sx={{
        ...boxLayout,
        border: `1px solid ${conf.borderColor}`,
        borderRadius: isConditionNode ? '50%' : 1,
        bgcolor: isDark ? '#1e1f25' : 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        color: isDark ? '#e5e7eb' : 'text.primary',
        boxShadow: activeGlow || (selected ? '0 0 0 1px rgba(25,118,210,0.35)' : '0 1px 4px rgba(0,0,0,0.05)'),
      }}
    >
      <Handle type="target" position={Position.Left} />
      <Stack direction="row" alignItems="center" spacing={0.25} sx={{ mb: 0.12, maxWidth: '100%', px: 0.1 }}>
        <Iconify icon={conf.icon} width={isConditionNode ? 8 : 9} />
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            lineHeight: 1.05,
            fontSize: '0.52rem',
            color: isDark ? '#f3f4f6' : 'inherit',
            wordBreak: 'break-word',
          }}
        >
          {data?.label || 'Node'}
        </Typography>
      </Stack>
      <Stack
        direction={isConditionNode ? 'column' : 'row'}
        spacing={0.2}
        flexWrap="wrap"
        alignItems="center"
        justifyContent="center"
      >
        <Chip size="small" label={kind} color={conf.chipColor} variant="soft" sx={COMPACT_CHIP_SX} />
        <Chip
          size="small"
          label={runStatus}
          variant={runStatus === 'idle' ? 'outlined' : 'soft'}
          color={
            runStatus === 'running'
              ? 'info'
              : runStatus === 'success'
                ? 'success'
                : runStatus === 'failed'
                  ? 'error'
                  : 'default'
          }
          sx={COMPACT_CHIP_SX}
        />
      </Stack>
      {data?.triggerType && !isTriggerNode && (
        <Typography variant="caption" sx={sublineSx}>
          Trigger: {getTriggerLabel(data.triggerType)}
        </Typography>
      )}
      {data?.actionType && (
        <Typography variant="caption" sx={sublineSx}>
          Action: {data.actionType}
        </Typography>
      )}
      <Handle type="source" position={Position.Right} />
    </Box>
  );
}

export function WorkflowBuilderView() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnFrom = searchParams.get('from');
  const returnId = searchParams.get('id');
  const templates = useMemo(
    () => ({
      welcome: {
        nodes: [
          {
            id: '1',
            type: 'triggerNode',
            position: { x: 80, y: 120 },
            data: { label: 'Trigger: user_registered', triggerType: 'user_registered', nodeKind: 'trigger' },
          },
          {
            id: '2',
            type: 'emailNode',
            position: { x: 420, y: 120 },
            data: {
              label: 'Action: send_email (welcome)',
              actionType: 'send_email',
              templateKey: 'welcome_email',
              nodeKind: 'send_email',
            },
          },
        ],
        edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }],
      },
      purchase: {
        nodes: [
          {
            id: '1',
            type: 'triggerNode',
            position: { x: 80, y: 120 },
            data: { label: 'Trigger: course_purchased', triggerType: 'course_purchased', nodeKind: 'trigger' },
          },
          {
            id: '2',
            type: 'emailNode',
            position: { x: 420, y: 120 },
            data: {
              label: 'Action: send_email (course purchase)',
              actionType: 'send_email',
              templateKey: 'course_purchase_email',
              nodeKind: 'send_email',
            },
          },
        ],
        edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }],
      },
    }),
    []
  );

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [newNodeIndex, setNewNodeIndex] = useState(1);
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [selectedEdgeId, setSelectedEdgeId] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [canvasBg, setCanvasBg] = useState(BackgroundVariant.Dots);
  const [quickTriggerType, setQuickTriggerType] = useState(triggerOptions[0].value);
  const [builderMode, setBuilderMode] = useState('dark');
  const isDarkBuilder = builderMode === 'dark';

  const flowPaneRef = useRef(null);
  const rfInstanceRef = useRef(null);

  /** Place new nodes in the middle of what you see on the canvas (respects pan/zoom). */
  const getPlacementPosition = useCallback((stackIndex = 0) => {
    const inst = rfInstanceRef.current;
    const el = flowPaneRef.current;
    const stagger = 20;
    const perRow = 6;
    const ix = stackIndex % perRow;
    const iy = Math.floor(stackIndex / perRow);
    if (!inst || !el) {
      return { x: 40 + ix * stagger, y: 40 + iy * stagger };
    }
    const rect = el.getBoundingClientRect();
    const center = inst.screenToFlowPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
    return {
      x: center.x - 56 + ix * stagger,
      y: center.y - 30 + iy * stagger,
    };
  }, []);

  useEffect(() => {
    let active = true;

    const hydrateBuilder = async () => {
      // In edit mode, prefer the saved workflow flowData over local draft/default state.
      if (returnFrom === 'edit' && returnId) {
        try {
          const workflow = await workflowService.getWorkflowById(returnId);
          const savedNodes = workflow?.flowData?.nodes;
          const savedEdges = workflow?.flowData?.edges;

          if (active && Array.isArray(savedNodes) && Array.isArray(savedEdges)) {
            setNodes(savedNodes);
            setEdges(savedEdges);
            setNewNodeIndex(savedNodes.length + 1);
            return;
          }
        } catch {
          // Fall back to local draft below if fetch fails.
        }
      }

      if (returnFrom === 'edit') {
        try {
          const raw = localStorage.getItem(TEMPLATE_FLOW_DRAFT_KEY);
          if (!raw) return;
          const draft = JSON.parse(raw);
          if (active && Array.isArray(draft?.nodes) && Array.isArray(draft?.edges)) {
            setNodes(draft.nodes);
            setEdges(draft.edges);
            setNewNodeIndex(draft.nodes.length + 1);
          }
        } catch {
          // Ignore invalid draft format.
        }
      } else {
        // For create/new route, always start with a blank canvas.
        setNodes([]);
        setEdges([]);
        setNewNodeIndex(1);
      }
    };

    hydrateBuilder();

    return () => {
      active = false;
    };
  }, [returnFrom, returnId, setEdges, setNodes]);

  const onConnect = useCallback(
    (connection) =>
      setEdges((prev) =>
        addEdge(
          {
            ...connection,
            markerEnd: { type: MarkerType.ArrowClosed },
            animated: true,
          },
          prev
        )
      ),
    [setEdges]
  );

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  const nodeTypes = useMemo(
    () => ({
      triggerNode: (props) => <WorkflowNodeCard {...props} isDark={isDarkBuilder} />,
      emailNode: (props) => <WorkflowNodeCard {...props} isDark={isDarkBuilder} />,
      conditionNode: (props) => <WorkflowNodeCard {...props} isDark={isDarkBuilder} />,
      delayNode: (props) => <WorkflowNodeCard {...props} isDark={isDarkBuilder} />,
      httpNode: (props) => <WorkflowNodeCard {...props} isDark={isDarkBuilder} />,
      genericNode: (props) => <WorkflowNodeCard {...props} isDark={isDarkBuilder} />,
    }),
    [isDarkBuilder]
  );

  const applyTemplate = useCallback(
    (key) => {
      const template = templates[key];
      if (!template) return;
      setNodes(template.nodes);
      setEdges(template.edges);
      setNewNodeIndex(3);
      toast.success('Template loaded');
      requestAnimationFrame(() => {
        rfInstanceRef.current?.fitView?.({ padding: 0.2, duration: 200 });
      });
    },
    [setEdges, setNodes, templates]
  );

  const addNodeByKind = useCallback(
    (kind) => {
      const nodeKind = nodeKinds.find((item) => item.key === kind);
      if (!nodeKind) return;
      const id = String(newNodeIndex);
      const triggerType = kind === 'trigger' ? 'manual_trigger' : undefined;
      const actionType = kind === 'send_email' ? 'send_email' : undefined;
      const templateKey = kind === 'send_email' ? 'welcome_email' : undefined;
      const nodeTypeByKind = {
        trigger: 'triggerNode',
        send_email: 'emailNode',
        condition: 'conditionNode',
        delay: 'delayNode',
        http_request: 'httpNode',
      };
      setNodes((prev) => [
        ...prev,
        {
          id,
          type: nodeTypeByKind[kind] || 'genericNode',
          position: getPlacementPosition(prev.length),
          data: {
            label: `${nodeKind.label} ${id}`,
            nodeKind: kind,
            triggerType,
            actionType,
            templateKey,
            delayMs: kind === 'delay' ? 1000 : undefined,
            conditionExpression: kind === 'condition' ? 'payload.totalAmount > 0' : undefined,
            requestUrl: kind === 'http_request' ? 'https://api.example.com/webhook' : undefined,
            requestMethod: kind === 'http_request' ? 'POST' : undefined,
          },
        },
      ]);
      setNewNodeIndex((prev) => prev + 1);
    },
    [getPlacementPosition, newNodeIndex, setNodes]
  );

  const updateSelectedNodeData = useCallback(
    (key, value) => {
      if (!selectedNodeId) return;
      setNodes((prev) =>
        prev.map((node) =>
          node.id === selectedNodeId
            ? { ...node, data: { ...(node.data || {}), [key]: value } }
            : node
        )
      );
    },
    [selectedNodeId, setNodes]
  );

  const addStep = useCallback(() => {
    const id = String(newNodeIndex);
    setNodes((prev) => [
      ...prev,
      {
        id,
        type: 'genericNode',
        position: getPlacementPosition(prev.length),
        data: { label: `Step ${id}`, nodeKind: 'default' },
      },
    ]);
    setNewNodeIndex((prev) => prev + 1);
  }, [getPlacementPosition, newNodeIndex, setNodes]);

  const addTriggerNode = useCallback(
    (triggerType) => {
      addNodeByKind('trigger');
      setTimeout(() => {
        setNodes((prev) => {
          if (!prev.length) return prev;
          const lastId = prev[prev.length - 1].id;
          return prev.map((node) =>
            node.id === lastId
              ? {
                  ...node,
                  data: {
                    ...(node.data || {}),
                  label: `Trigger: ${getTriggerLabel(triggerType)}`,
                    triggerType,
                  },
                }
              : node
          );
        });
      }, 0);
    },
    [addNodeByKind, setNodes]
  );

  const deleteSelected = useCallback(() => {
    if (selectedEdgeId) {
      setEdges((prev) => prev.filter((edge) => edge.id !== selectedEdgeId));
      setSelectedEdgeId('');
      toast.success('Selected edge removed');
      return;
    }
    if (selectedNodeId) {
      setNodes((prev) => prev.filter((node) => node.id !== selectedNodeId));
      setEdges((prev) =>
        prev.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId)
      );
      setSelectedNodeId('');
      toast.success('Selected node removed');
    }
  }, [selectedEdgeId, selectedNodeId, setEdges, setNodes]);

  const duplicateSelectedNode = useCallback(() => {
    if (!selectedNode) return;
    const id = String(newNodeIndex);
    setNodes((prev) => [
      ...prev,
      {
        ...selectedNode,
        id,
        position: {
          x: Number(selectedNode.position?.x || 0) + 40,
          y: Number(selectedNode.position?.y || 0) + 40,
        },
        data: {
          ...(selectedNode.data || {}),
          label: `${selectedNode.data?.label || 'Node'} Copy`,
        },
      },
    ]);
    setNewNodeIndex((prev) => prev + 1);
  }, [newNodeIndex, selectedNode, setNodes]);

  const setNodeRunStatus = useCallback(
    (nodeId, status) => {
      const statusStyle =
        status === 'running'
          ? { border: '2px solid #0288d1', boxShadow: '0 0 0 3px rgba(2,136,209,0.15)' }
          : status === 'success'
            ? { border: '2px solid #2e7d32', boxShadow: '0 0 0 3px rgba(46,125,50,0.14)' }
            : status === 'failed'
              ? { border: '2px solid #d32f2f', boxShadow: '0 0 0 3px rgba(211,47,47,0.14)' }
              : { border: '1px solid #bdbdbd', boxShadow: 'none' };
      setNodes((prev) =>
        prev.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                style: { ...(node.style || {}), ...statusStyle },
                data: { ...(node.data || {}), runStatus: status },
              }
            : node
        )
      );
    },
    [setNodes]
  );

  const runSimulation = useCallback(async () => {
    if (!nodes.length) {
      toast.error('Add nodes before running simulation.');
      return;
    }
    setIsRunning(true);
    try {
      const startNodes =
        nodes.filter((node) => node.type === 'input').length > 0
          ? nodes.filter((node) => node.type === 'input')
          : [nodes[0]];
      const queue = startNodes.map((node) => node.id);
      const visited = new Set();
      while (queue.length > 0) {
        const currentId = queue.shift();
        if (!currentId || visited.has(currentId)) continue;
        visited.add(currentId);

        setNodeRunStatus(currentId, 'running');
        await wait(450);
        setNodeRunStatus(currentId, 'success');

        edges
          .filter((edge) => edge.source === currentId)
          .forEach((edge) => {
            queue.push(edge.target);
          });
      }
      toast.success('Simulation finished');
    } finally {
      setIsRunning(false);
    }
  }, [edges, nodes, setNodeRunStatus]);

  const clearRunStatus = useCallback(() => {
    setNodes((prev) =>
      prev.map((node) => ({
        ...node,
        style: { ...(node.style || {}), border: '1px solid #bdbdbd', boxShadow: 'none' },
        data: { ...(node.data || {}), runStatus: 'idle' },
      }))
    );
  }, [setNodes]);

  const copyJson = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ nodes, edges }, null, 2));
      toast.success('Workflow JSON copied');
    } catch {
      toast.error('Failed to copy JSON');
    }
  }, [edges, nodes]);

  const importJson = useCallback(() => {
    const raw = window.prompt('Paste workflow JSON (nodes + edges):');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed?.nodes) || !Array.isArray(parsed?.edges)) {
        toast.error('Invalid JSON format');
        return;
      }
      setNodes(parsed.nodes);
      setEdges(parsed.edges);
      setNewNodeIndex(parsed.nodes.length + 1);
      toast.success('Workflow JSON imported');
      requestAnimationFrame(() => {
        rfInstanceRef.current?.fitView?.({ padding: 0.2, duration: 200 });
      });
    } catch {
      toast.error('Invalid JSON');
    }
  }, [setEdges, setNodes]);

  const saveAndLinkTemplate = useCallback(async () => {
    if (!nodes.length) {
      toast.error('Add at least one node before linking.');
      return;
    }
    const payload = {
      nodes,
      edges,
      savedAt: new Date().toISOString(),
      version: 1,
    };

    const returnPath =
      returnFrom === 'edit' && returnId
        ? paths.admin.workflow.edit(returnId)
        : `${paths.admin.workflow.new}?linkedFlow=1`;

    if (returnFrom === 'edit' && returnId) {
      try {
        await dispatch(
          updateWorkflow({
            id: returnId,
            workflowData: {
              flowData: {
                nodes,
                edges,
              },
            },
            imageFile: null,
          })
        ).unwrap();
        localStorage.setItem(TEMPLATE_FLOW_DRAFT_KEY, JSON.stringify(payload));
        toast.success('Workflow saved to database');
        router.push(returnPath);
      } catch {
        toast.error('Failed to save workflow');
      }
      return;
    }

    localStorage.setItem(TEMPLATE_FLOW_DRAFT_KEY, JSON.stringify(payload));
    toast.success('Workflow linked to template create form');
    router.push(returnPath);
  }, [dispatch, edges, nodes, returnFrom, returnId, router]);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Advanced Workflow Builder"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'AI Resource', href: paths.admin.workflow.list },
          { name: 'Builder' },
        ]}
        sx={{ mb: { xs: 3, md: 4 } }}
      />

      <Card sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => setBuilderMode((prev) => (prev === 'dark' ? 'light' : 'dark'))}
            startIcon={<Iconify icon={isDarkBuilder ? 'solar:sun-bold' : 'solar:moon-stars-bold'} width={18} />}
          >
            {isDarkBuilder ? 'Light Mode' : 'Dark Mode'}
          </Button>
          <Button variant="contained" color="success" onClick={() => applyTemplate('welcome')}>
            Welcome Template
          </Button>
          <Button variant="contained" color="secondary" onClick={() => applyTemplate('purchase')}>
            Purchase Template
          </Button>
          <TextField
            select
            size="small"
            label="Add Trigger"
            value={quickTriggerType}
            onChange={(e) => setQuickTriggerType(e.target.value)}
            sx={{ minWidth: 220 }}
          >
            {triggerOptions.map((trigger) => (
              <MenuItem key={trigger.value} value={trigger.value}>
                {trigger.label}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction="row" spacing={0.5} flexWrap="wrap">
            <Tooltip title="Add Trigger">
              <IconButton color="info" onClick={() => addTriggerNode(quickTriggerType)}>
                <Iconify icon="solar:play-circle-bold" width={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Add Email Node">
              <IconButton onClick={() => addNodeByKind('send_email')}>
                <Iconify icon="solar:letter-bold" width={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Add Condition Node">
              <IconButton onClick={() => addNodeByKind('condition')}>
                <Iconify icon="solar:checklist-minimalistic-bold" width={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Add Delay Node">
              <IconButton onClick={() => addNodeByKind('delay')}>
                <Iconify icon="solar:clock-circle-bold" width={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Add HTTP Node">
              <IconButton onClick={() => addNodeByKind('http_request')}>
                <Iconify icon="solar:global-bold" width={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Add Generic Step">
              <IconButton onClick={addStep}>
                <Iconify icon="solar:add-circle-bold" width={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Selected">
              <IconButton color="warning" onClick={deleteSelected}>
                <Iconify icon="solar:trash-bin-trash-bold" width={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Duplicate Node">
              <IconButton onClick={duplicateSelectedNode}>
                <Iconify icon="solar:copy-bold" width={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Run Test">
              <span>
                <IconButton color="secondary" onClick={runSimulation} disabled={isRunning}>
                  <Iconify icon="solar:play-bold" width={18} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Clear Status">
              <span>
                <IconButton onClick={clearRunStatus} disabled={isRunning}>
                  <Iconify icon="solar:restart-bold" width={18} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Export JSON">
              <IconButton onClick={copyJson}>
                <Iconify icon="solar:download-bold" width={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Import JSON">
              <IconButton onClick={importJson}>
                <Iconify icon="solar:upload-bold" width={18} />
              </IconButton>
            </Tooltip>
          </Stack>
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="contained" color="primary" onClick={saveAndLinkTemplate}>
            Save & Link to Template
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => {
              setNodes([]);
              setEdges([]);
              setNewNodeIndex(1);
            }}
          >
            Reset Canvas
          </Button>
        </Stack>
      </Card>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Card sx={{ p: 0, overflow: 'hidden', flexGrow: 1, bgcolor: isDarkBuilder ? '#101215' : 'background.paper' }}>
          <Box
            ref={flowPaneRef}
            sx={{ height: 'calc(100vh - 320px)', minHeight: 520, bgcolor: isDarkBuilder ? '#111318' : '#f9fafb' }}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              onInit={(instance) => {
                rfInstanceRef.current = instance;
              }}
              onNodeClick={(event, node) => {
                setSelectedNodeId(node.id);
                setSelectedEdgeId('');
              }}
              onEdgeClick={(event, edge) => {
                setSelectedEdgeId(edge.id);
                setSelectedNodeId('');
              }}
              fitView
              fitViewOptions={{ padding: 0.2 }}
            >
              <Panel position="top-left">
                <Stack direction="row" spacing={1}>
                  <Chip
                    size="small"
                    color={isRunning ? 'warning' : 'default'}
                    label={isRunning ? 'Run: Active' : 'Run: Idle'}
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() =>
                      setCanvasBg((prev) =>
                        prev === BackgroundVariant.Dots
                          ? BackgroundVariant.Lines
                          : prev === BackgroundVariant.Lines
                            ? BackgroundVariant.Cross
                            : BackgroundVariant.Dots
                      )
                    }
                  >
                    Toggle Grid
                  </Button>
                </Stack>
              </Panel>
              <MiniMap />
              <Controls />
              <Background variant={canvasBg} gap={18} />
            </ReactFlow>
          </Box>
        </Card>

        <Card sx={{ width: { xs: '100%', md: 360 }, p: 2 }}>
          <Typography variant="h6">Node Settings</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
            Select a node from canvas and edit its action settings.
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {!selectedNode ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No node selected.
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              <TextField
                label="Node Label"
                size="small"
                value={selectedNode.data?.label || ''}
                onChange={(e) => updateSelectedNodeData('label', e.target.value)}
              />
              <TextField
                select
                label="Node Kind"
                size="small"
                value={selectedNode.data?.nodeKind || 'trigger'}
                onChange={(e) => updateSelectedNodeData('nodeKind', e.target.value)}
              >
                {nodeKinds.map((kind) => (
                  <MenuItem key={kind.key} value={kind.key}>
                    {kind.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Trigger Type"
                size="small"
                value={selectedNode.data?.triggerType || 'manual_trigger'}
                onChange={(e) => updateSelectedNodeData('triggerType', e.target.value)}
              >
                {triggerOptions.map((trigger) => (
                  <MenuItem key={trigger.value} value={trigger.value}>
                    {trigger.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Action Type"
                size="small"
                value={selectedNode.data?.actionType || 'send_email'}
                onChange={(e) => updateSelectedNodeData('actionType', e.target.value)}
              >
                <MenuItem value="send_email">send_email</MenuItem>
                <MenuItem value="condition">condition</MenuItem>
                <MenuItem value="delay">delay</MenuItem>
                <MenuItem value="http_request">http_request</MenuItem>
              </TextField>
              <TextField
                label="Template Key"
                size="small"
                value={selectedNode.data?.templateKey || ''}
                onChange={(e) => updateSelectedNodeData('templateKey', e.target.value)}
              />
              <TextField
                label="Delay (ms)"
                size="small"
                value={selectedNode.data?.delayMs || ''}
                onChange={(e) => updateSelectedNodeData('delayMs', e.target.value)}
              />
              <TextField
                label="Condition Expression"
                size="small"
                value={selectedNode.data?.conditionExpression || ''}
                onChange={(e) => updateSelectedNodeData('conditionExpression', e.target.value)}
              />
              <TextField
                label="HTTP URL"
                size="small"
                value={selectedNode.data?.requestUrl || ''}
                onChange={(e) => updateSelectedNodeData('requestUrl', e.target.value)}
              />
              <TextField
                select
                label="HTTP Method"
                size="small"
                value={selectedNode.data?.requestMethod || 'POST'}
                onChange={(e) => updateSelectedNodeData('requestMethod', e.target.value)}
              >
                <MenuItem value="GET">GET</MenuItem>
                <MenuItem value="POST">POST</MenuItem>
                <MenuItem value="PUT">PUT</MenuItem>
                <MenuItem value="DELETE">DELETE</MenuItem>
              </TextField>
            </Stack>
          )}
        </Card>
      </Stack>
      <Card sx={{ p: 2, mt: 2 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          When you click <strong>Save & Link to Template</strong>, this full builder workflow is connected to
          the template create form and saved there after template submit.
        </Typography>
      </Card>
    </DashboardContent>
  );
}

