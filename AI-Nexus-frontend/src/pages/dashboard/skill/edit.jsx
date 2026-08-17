import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';

import { CONFIG } from 'src/config-global';
import { useParams } from 'src/routes/hooks';
import { skillService } from 'src/services/skill.service';
import { toast } from 'src/components/snackbar';
import { SkillEditView } from 'src/sections/dashboard/skill/view';
import { LoadingScreen } from 'src/components/loading-screen';

const metadata = { title: `Skill edit | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const { id = '' } = useParams();
  const [skill, setSkill] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await skillService.getSkillById(id, { includeInactive: true });
        if (mounted) setSkill(data || null);
      } catch (error) {
        if (mounted) setSkill(null);
        toast.error(error?.message || 'Failed to load skill');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <SkillEditView skill={skill} />
    </>
  );
}
