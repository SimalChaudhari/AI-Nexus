'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { paths } from 'src/routes/paths';

/** Legacy /ai-fluency → dashboard hub (Step 7.2). Role planner lives at /ai-fluency/roles. */
export default function AiFluencyPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(paths.dashboard);
  }, [router]);

  return null;
}
