import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import { paths } from 'src/routes/paths';

// Must match keys in workflow-new-edit-form.jsx and workflow-builder-view.jsx
const CREATE_FORM_DRAFT_KEY = 'aiNexus.workflow.createFormDraft';
const TEMPLATE_FLOW_DRAFT_KEY = 'aiNexus.workflow.templateFlowDraft';
const EDIT_FORM_DRAFT_KEY_PREFIX = 'aiNexus.workflow.editFormDraft.';

function clearEditFormDraftStorage(id) {
  if (!id) return;
  try {
    sessionStorage.removeItem(`${EDIT_FORM_DRAFT_KEY_PREFIX}${id}`);
  } catch {
    // ignore
  }
}

function isInsideAiResourceCreateFlow(pathname, search) {
  if (pathname === paths.admin.workflow.new) {
    return true;
  }
  if (pathname === paths.admin.workflow.builder) {
    const params = new URLSearchParams(search);
    return params.get('from') === 'create';
  }
  return false;
}

/** Active workflow id while on edit page or builder opened from edit. */
function parseEditFlowId(pathname, search) {
  const match = pathname.match(/\/ai-resources\/([^/]+)\/edit\/?$/);
  if (match?.[1]) {
    return match[1];
  }
  if (pathname === paths.admin.workflow.builder) {
    const params = new URLSearchParams(search);
    if (params.get('from') === 'edit') {
      const id = params.get('id');
      if (id) return id;
    }
  }
  return null;
}

/**
 * Clears persisted drafts when the user leaves the create or edit AI-resource + builder flow
 * without saving the main form (so abandoned typing does not reappear later).
 */
export function useClearAiResourceCreateDraftOnLeave() {
  const location = useLocation();
  const wasInsideCreateRef = useRef(false);
  const prevEditIdRef = useRef(null);

  useEffect(() => {
    const createInside = isInsideAiResourceCreateFlow(location.pathname, location.search);
    const editId = parseEditFlowId(location.pathname, location.search);

    if (wasInsideCreateRef.current && !createInside) {
      try {
        sessionStorage.removeItem(CREATE_FORM_DRAFT_KEY);
        localStorage.removeItem(TEMPLATE_FLOW_DRAFT_KEY);
      } catch {
        // ignore private mode / quota
      }
    }

    const prevEditId = prevEditIdRef.current;
    if (prevEditId && editId !== prevEditId) {
      clearEditFormDraftStorage(prevEditId);
    }

    wasInsideCreateRef.current = createInside;
    prevEditIdRef.current = editId;
  }, [location.pathname, location.search]);
}
