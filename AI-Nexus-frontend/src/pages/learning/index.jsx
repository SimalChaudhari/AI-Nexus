import { Helmet } from 'react-helmet-async';
import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import { CONFIG } from 'src/config-global';

import { LearningTopBar, LearningMainSection } from 'src/sections/learning';
import { LEARNING_ADD_TO_CART_ENABLED } from 'src/sections/learning/learning-feature-flags';

// ----------------------------------------------------------------------

const metadata = { title: `Learning | ${CONFIG.site.name}` };
const VALID_TABS = new Set(['courses', 'progress', 'favorites', 'badges', 'certificates']);

export default function LearningPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = VALID_TABS.has(searchParams.get('tab')) ? searchParams.get('tab') : 'courses';

  const setActiveTab = useCallback(
    (tab) => {
      const nextTab = VALID_TABS.has(tab) ? tab : 'courses';
      const nextParams = new URLSearchParams(searchParams);

      if (nextTab === 'courses') {
        nextParams.delete('tab');
      } else {
        nextParams.set('tab', nextTab);
      }

      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <LearningTopBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        showCart={LEARNING_ADD_TO_CART_ENABLED && activeTab === 'courses'}
      />
      <LearningMainSection activeTab={activeTab} setActiveTab={setActiveTab} />
    </>
  );
}
