import { useEffect, useState } from 'react';

import { intlPathwayService } from 'src/services/intl-pathway.service';
import { getModuleVideoUrl } from './pathway-module-videos';

/**
 * Loads pathway modules from admin-managed API.
 * Video URL / minutes come from International admin panel.
 */
export function usePathwayModuleVideos() {
  const [videoUrlsByCode, setVideoUrlsByCode] = useState({});
  const [minutesByCode, setMinutesByCode] = useState({});
  const [modulesByCode, setModulesByCode] = useState({});
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    setLoading(true);
    intlPathwayService
      .getPlannerCatalog()
      .then((catalog) => {
        if (!active) return;

        const moduleRows = Array.isArray(catalog?.modules) ? catalog.modules : [];
        const roleRows = Array.isArray(catalog?.roles) ? catalog.roles : [];

        const videos = {};
        const minutes = {};
        const byCode = {};

        moduleRows.forEach((row) => {
          const code = String(row?.code || '').trim();
          if (!code) return;
          byCode[code] = row;

          const override = getModuleVideoUrl(code);
          const apiUrl = String(row?.videoUrl || '').trim();
          if (override) videos[code] = override;
          else if (apiUrl) videos[code] = apiUrl;

          const mins = Number(row?.minutes);
          if (Number.isFinite(mins) && mins > 0) minutes[code] = mins;
        });

        setVideoUrlsByCode(videos);
        setMinutesByCode(minutes);
        setModulesByCode(byCode);
        setRoles(roleRows);
      })
      .catch(() => {
        if (!active) return;
        setVideoUrlsByCode({});
        setMinutesByCode({});
        setModulesByCode({});
        setRoles([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { videoUrlsByCode, minutesByCode, modulesByCode, roles, loading };
}
