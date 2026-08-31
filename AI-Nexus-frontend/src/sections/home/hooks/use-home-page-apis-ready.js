import { useEffect, useState } from 'react';

import { appSettingsService } from 'src/services/app-settings.service';

// ----------------------------------------------------------------------

/** True after all home-page content APIs have settled (success or failure). */
export function useHomePageApisReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      appSettingsService.getPublic(),
      appSettingsService.getCurriculumContent(),
      appSettingsService.getProgrammeFeesContent(),
      appSettingsService.getFaqContent(),
    ]).finally(() => {
      if (active) setReady(true);
    });

    return () => {
      active = false;
    };
  }, []);

  return ready;
}
