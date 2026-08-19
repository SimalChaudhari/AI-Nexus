'use client';

import { useEffect, useState } from 'react';

import { INTL_AUTH_CHANGED_EVENT, isIntlAuthenticated } from 'src/auth/intl-session';
import { intlPathwayService } from 'src/services/intl-pathway.service';
import { getModuleVideoUrl } from './pathway-module-videos';

/**
 * Loads pathway modules from admin-managed API.
 * Video URLs are only returned after international login.
 */
export function usePathwayModuleVideos() {
  const [videoUrlsByCode, setVideoUrlsByCode] = useState({});
  const [minutesByCode, setMinutesByCode] = useState({});
  const [modulesByCode, setModulesByCode] = useState({});
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let requestId = 0;

    const load = () => {
      const id = ++requestId;
      setLoading(true);
      intlPathwayService
        .getPlannerCatalog()
        .then((catalog) => {
          if (!active || id !== requestId) return;

          const moduleRows = Array.isArray(catalog?.modules) ? catalog.modules : [];
          const roleRows = Array.isArray(catalog?.roles) ? catalog.roles : [];
          const signedIn = isIntlAuthenticated();

          const videos = {};
          const minutes = {};
          const byCode = {};

          moduleRows.forEach((row) => {
            const code = String(row?.code || '').trim();
            if (!code) return;
            byCode[code] = {
              ...row,
              videoUrl: signedIn ? String(row?.videoUrl || '').trim() : '',
            };

            if (signedIn) {
              const override = getModuleVideoUrl(code);
              const apiUrl = String(row?.videoUrl || '').trim();
              if (override) videos[code] = override;
              else if (apiUrl) videos[code] = apiUrl;
            }

            const mins = Number(row?.minutes);
            if (Number.isFinite(mins) && mins > 0) minutes[code] = mins;
          });

          setVideoUrlsByCode(videos);
          setMinutesByCode(minutes);
          setModulesByCode(byCode);
          setRoles(roleRows);
        })
        .catch(() => {
          if (!active || id !== requestId) return;
          setVideoUrlsByCode({});
          setMinutesByCode({});
          setModulesByCode({});
          setRoles([]);
        })
        .finally(() => {
          if (active && id === requestId) setLoading(false);
        });
    };

    load();
    window.addEventListener(INTL_AUTH_CHANGED_EVENT, load);
    return () => {
      active = false;
      window.removeEventListener(INTL_AUTH_CHANGED_EVENT, load);
    };
  }, []);

  return { videoUrlsByCode, minutesByCode, modulesByCode, roles, loading };
}
