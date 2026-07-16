import axios from 'src/utils/axios';

const parseAnalytic = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const parseFlowData = (value) => {
  if (!value) return null;
  let parsed = value;

  // Some Flowise marketplace responses contain nested/double-encoded JSON strings.
  for (let i = 0; i < 3; i += 1) {
    if (typeof parsed !== 'string') break;
    try {
      parsed = JSON.parse(parsed);
    } catch {
      break;
    }
  }

  if (!parsed || typeof parsed !== 'object') return null;

  if (Array.isArray(parsed.nodes) || Array.isArray(parsed.edges)) {
    return {
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed.edges) ? parsed.edges : [],
    };
  }

  // Handle wrapped payloads like { flowData: { nodes, edges } } or { flowData: "<json>" }.
  if (parsed.flowData) {
    const unwrapped = parseFlowData(parsed.flowData);
    if (unwrapped) return unwrapped;
  }

  return null;
};

const normalizeTemplateId = (flow) => {
  if (flow?.templateSource === 'community_template') {
    return `flowise-community-${String(flow?.templateName || flow?.name || 'template').toLowerCase().replace(/\s+/g, '-')}`;
  }
  if (flow?.templateSource === 'my_template') {
    return `flowise-my-${String(flow?.id || flow?.templateName || flow?.name || 'template').toLowerCase().replace(/\s+/g, '-')}`;
  }
  return `flowise-${flow.id}`;
};

const parseMaybeJsonObject = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const firstNonEmptyString = (...values) =>
  values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim() || '';

const resolveTemplateImage = (flow) => {
  const analytic = parseAnalytic(flow?.analytic);
  const flowData = parseMaybeJsonObject(flow?.flowData);
  const templateDetails = parseMaybeJsonObject(flow?.templateDetails);
  const metadata = parseMaybeJsonObject(flow?.metadata);

  return firstNonEmptyString(
    flow?.image,
    flow?.iconSrc,
    flow?.iconURL,
    flow?.iconUrl,
    flow?.thumbnail,
    flow?.thumbnailUrl,
    flow?.templateImage,
    flow?.templateIcon,
    templateDetails?.image,
    templateDetails?.iconSrc,
    templateDetails?.thumbnail,
    metadata?.image,
    metadata?.iconSrc,
    analytic?.image,
    analytic?.iconSrc,
    flowData?.image,
    flowData?.iconSrc
  );
};

const getFallbackTemplateImage = (flowType, templateSource) => {
  const flowiseDarkLogo = 'https://raw.githubusercontent.com/FlowiseAI/Flowise/main/images/flowise_dark.svg';
  const flowiseWhiteLogo = 'https://raw.githubusercontent.com/FlowiseAI/Flowise/main/images/flowise_white.svg';

  if (templateSource === 'community_template') return flowiseDarkLogo;
  if (flowType === 'AGENTFLOW') return flowiseDarkLogo;
  if (flowType === 'CHATFLOW') return flowiseWhiteLogo;
  return flowiseDarkLogo;
};

const mapFlowiseFlowToTemplate = (flow) => {
  const analytic = parseAnalytic(flow.analytic);
  const creator = analytic?.aiNexusCreator || {};
  const creatorName = creator.name || creator.email || 'Unknown user';
  const creatorId = String(creator.id || '').trim();
  const templateVisibility =
    String(analytic?.aiNexusTemplateVisibility || 'public').trim().toLowerCase() === 'private'
      ? 'private'
      : 'public';
  const createdAt = flow.createdDate || flow.updatedDate || new Date().toISOString();
  const parsedFlowData = parseFlowData(flow.flowData);
  const normalizedSource = flow?.templateSource || 'workspace_flow';
  const sourceLabel =
    normalizedSource === 'community_template'
      ? 'Flowise Community'
      : normalizedSource === 'my_template'
        ? 'Flowise My Template'
        : 'Flowise Template';
  const rawType = String(flow.type || '').toUpperCase().replace(/\s+/g, '');
  const flowType =
    rawType === 'AGENTFLOWV2' || rawType === 'MULTIAGENT' || rawType === 'AGENTFLOW'
      ? 'AGENTFLOW'
      : rawType === 'CHATFLOW' || rawType === 'ASSISTANT'
        ? 'CHATFLOW'
        : rawType || (normalizedSource === 'my_template' ? 'CHATFLOW' : 'CHATFLOW');
  const resolvedImage = resolveTemplateImage(flow) || getFallbackTemplateImage(flowType, normalizedSource);

  return {
    id: normalizeTemplateId(flow),
    source: 'flowise',
    flowiseId: normalizedSource === 'workspace_flow' ? flow.id : null,
    flowiseType: flowType,
    flowiseTemplateSource: normalizedSource,
    title: flow.templateName || flow.name || 'Untitled flow',
    description: flow.description || (flow.type ? `${flow.type} template from Flowise` : 'Template from Flowise'),
    image: resolvedImage,
    label: { title: sourceLabel },
    tags: [{ title: flowType }],
    flowData: parsedFlowData,
    createdAt,
    updatedAt: flow.updatedDate || createdAt,
    createdBy: creatorName,
    creatorId,
    templateVisibility,
    isPreviewOnly: normalizedSource !== 'workspace_flow',
  };
};

export const flowiseTemplateService = {
  async getFlowiseTemplates() {
    let payload;
    try {
      const response = await axios.get('/workflows/flowise-templates');
      payload = response?.data;
    } catch {
      throw new Error('Failed to fetch Flowise templates');
    }
    const rows = Array.isArray(payload?.data) ? payload.data : [];
    const byId = new Map();
    rows.forEach((row) => byId.set(row.id, row));

    return [...byId.values()]
      .map(mapFlowiseFlowToTemplate)
      .sort((a, b) => {
        const sourceRank = {
          community_template: 0,
          my_template: 1,
          workspace_flow: 2,
        };
        const aRank = sourceRank[a.flowiseTemplateSource] ?? 99;
        const bRank = sourceRank[b.flowiseTemplateSource] ?? 99;
        if (aRank !== bRank) return aRank - bRank;

        // Community templates should be shown alphabetically (A-Z).
        if (a.flowiseTemplateSource === 'community_template' && b.flowiseTemplateSource === 'community_template') {
          return String(a.title || '').localeCompare(String(b.title || ''));
        }

        // Keep stable and user-friendly ordering for other sources.
        if (a.flowiseTemplateSource === 'my_template' && b.flowiseTemplateSource === 'my_template') {
          return String(a.title || '').localeCompare(String(b.title || ''));
        }

        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });
  },
  async getFlowiseTemplateById(flowiseTemplateId) {
    const all = await this.getFlowiseTemplates();
    return all.find((item) => item.id === flowiseTemplateId) || null;
  },
  async updateTemplateVisibility(flowiseId, visibility) {
    const response = await axios.patch(`/workflows/flowise-templates/${encodeURIComponent(flowiseId)}/visibility`, {
      visibility,
    });
    return response?.data;
  },
};

