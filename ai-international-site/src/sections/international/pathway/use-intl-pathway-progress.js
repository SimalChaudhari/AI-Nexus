'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { INTL_AUTH_CHANGED_EVENT, isIntlAuthenticated } from 'src/auth/intl-session';
import { intlPathwayProgressService } from 'src/services/intl-pathway-progress.service';
import { flushPendingIntlModuleProgress } from 'src/utils/intl-module-progress-save';
import {
  clearCachedProgressMap,
  clearLegacyIntlProgressBrowserStorage,
  mergeProgressMaps,
  mergeProgressRow,
  readCachedProgressMap,
  writeCachedModuleProgress,
  writeCachedProgressMap,
} from 'src/utils/intl-progress-cache';

export const INTL_PATHWAY_PROGRESS_EVENT = 'intl-pathway-progress';

clearLegacyIntlProgressBrowserStorage();

export function notifyIntlPathwayProgress(code, row) {
  if (typeof window === 'undefined' || !code || !row) return;
  writeCachedModuleProgress(code, row);
  window.dispatchEvent(new CustomEvent(INTL_PATHWAY_PROGRESS_EVENT, { detail: { code, row } }));
}

export function notifyIntlPathwayProgressMap(map) {
  if (typeof window === 'undefined' || !map || typeof map !== 'object') return;
  const merged = mergeProgressMaps(readCachedProgressMap(), map);
  writeCachedProgressMap(merged);
  window.dispatchEvent(new CustomEvent(INTL_PATHWAY_PROGRESS_EVENT, { detail: { map: merged } }));
}

const IntlPathwayProgressContext = createContext(null);

/**
 * Single shared progress store for dashboard / planner / certificate bar.
 * Multiple hook instances were each calling refresh() and replacing React state
 * with the server list — wiping live % until a full page refresh.
 */
export function IntlPathwayProgressProvider({ children }) {
  const [progressByCode, setProgressByCode] = useState(() => readCachedProgressMap());
  const [certificates, setCertificates] = useState([]);
  const serverHydratedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!isIntlAuthenticated()) {
      serverHydratedRef.current = false;
      setProgressByCode({});
      setCertificates([]);
      clearCachedProgressMap();
      return;
    }
    try {
      const [progress, certs] = await Promise.all([
        intlPathwayProgressService.listProgress(),
        intlPathwayProgressService.listCertificates(),
      ]);
      const fromServer = progress && typeof progress === 'object' ? progress : {};
      setProgressByCode((prev) => {
        // First successful fetch: server is source of truth (empty list clears after DB wipe).
        if (!serverHydratedRef.current) {
          serverHydratedRef.current = true;
          writeCachedProgressMap(fromServer);
          return fromServer;
        }
        // Later refreshes: keep richer in-flight watch progress on the open lesson.
        const merged = mergeProgressMaps(fromServer, prev);
        writeCachedProgressMap(merged);
        return merged;
      });
      setCertificates(Array.isArray(certs) ? certs : []);
      await flushPendingIntlModuleProgress();
    } catch {
      setProgressByCode((prev) => prev);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onProgress = (event) => {
      if (event?.detail?.map && typeof event.detail.map === 'object') {
        setProgressByCode((prev) => {
          const merged = mergeProgressMaps(prev, event.detail.map);
          writeCachedProgressMap(merged);
          return merged;
        });
        return;
      }
      const code = event?.detail?.code;
      const row = event?.detail?.row;
      if (!code || !row) return;
      setProgressByCode((prev) => {
        const next = { ...prev, [code]: mergeProgressRow(prev[code], row) };
        writeCachedModuleProgress(code, next[code]);
        return next;
      });
    };
    window.addEventListener(INTL_AUTH_CHANGED_EVENT, refresh);
    window.addEventListener(INTL_PATHWAY_PROGRESS_EVENT, onProgress);
    return () => {
      window.removeEventListener(INTL_AUTH_CHANGED_EVENT, refresh);
      window.removeEventListener(INTL_PATHWAY_PROGRESS_EVENT, onProgress);
    };
  }, [refresh]);

  const upsertLocal = useCallback((code, row) => {
    if (!code || !row) return;
    setProgressByCode((prev) => {
      const nextRow = mergeProgressRow(prev[code], row);
      const next = { ...prev, [code]: nextRow };
      writeCachedModuleProgress(code, nextRow);
      return next;
    });
    // Keep orphan listeners / certificate bar in sync without requiring a page refresh.
    notifyIntlPathwayProgress(code, row);
  }, []);

  const value = useMemo(
    () => ({ progressByCode, certificates, refresh, upsertLocal }),
    [progressByCode, certificates, refresh, upsertLocal],
  );

  return (
    <IntlPathwayProgressContext.Provider value={value}>
      {children}
    </IntlPathwayProgressContext.Provider>
  );
}

export function useIntlPathwayProgress() {
  const ctx = useContext(IntlPathwayProgressContext);
  // Fallback for pages that do not wrap the provider yet (standalone planner route).
  const [progressByCode, setProgressByCode] = useState(() => readCachedProgressMap());
  const [certificates, setCertificates] = useState([]);
  const serverHydratedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!isIntlAuthenticated()) {
      serverHydratedRef.current = false;
      setProgressByCode({});
      setCertificates([]);
      clearCachedProgressMap();
      return;
    }
    try {
      const [progress, certs] = await Promise.all([
        intlPathwayProgressService.listProgress(),
        intlPathwayProgressService.listCertificates(),
      ]);
      const fromServer = progress && typeof progress === 'object' ? progress : {};
      setProgressByCode((prev) => {
        if (!serverHydratedRef.current) {
          serverHydratedRef.current = true;
          writeCachedProgressMap(fromServer);
          return fromServer;
        }
        const merged = mergeProgressMaps(fromServer, prev);
        writeCachedProgressMap(merged);
        return merged;
      });
      setCertificates(Array.isArray(certs) ? certs : []);
      await flushPendingIntlModuleProgress();
    } catch {
      // Keep in-memory React state; do not read browser storage.
      setProgressByCode((prev) => prev);
    }
  }, []);

  useEffect(() => {
    if (ctx) return undefined;
    void refresh();
    const onProgress = (event) => {
      if (event?.detail?.map && typeof event.detail.map === 'object') {
        setProgressByCode((prev) => mergeProgressMaps(prev, event.detail.map));
        return;
      }
      const code = event?.detail?.code;
      const row = event?.detail?.row;
      if (!code || !row) return;
      setProgressByCode((prev) => ({ ...prev, [code]: mergeProgressRow(prev[code], row) }));
    };
    window.addEventListener(INTL_AUTH_CHANGED_EVENT, refresh);
    window.addEventListener(INTL_PATHWAY_PROGRESS_EVENT, onProgress);
    return () => {
      window.removeEventListener(INTL_AUTH_CHANGED_EVENT, refresh);
      window.removeEventListener(INTL_PATHWAY_PROGRESS_EVENT, onProgress);
    };
  }, [ctx, refresh]);

  const upsertLocal = useCallback((code, row) => {
    if (!code || !row) return;
    setProgressByCode((prev) => ({ ...prev, [code]: mergeProgressRow(prev[code], row) }));
    notifyIntlPathwayProgress(code, row);
  }, []);

  if (ctx) return ctx;
  return { progressByCode, certificates, refresh, upsertLocal };
}
