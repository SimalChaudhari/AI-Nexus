import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';

import { CONFIG } from 'src/config-global';
import { useParams } from 'src/routes/hooks';
import { skillService } from 'src/services/skill.service';
import { toast } from 'src/components/snackbar';
import { SkillDetailsView } from 'src/sections/dashboard/skill/view';

const metadata = { title: `Skill details | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const { id = '' } = useParams();
  const [skill, setSkill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await skillService.getSkillById(id, { includeInactive: true });
        if (mounted) {
          setSkill(data);
          setError(null);
        }
      } catch (err) {
        if (mounted) setError(err);
        toast.error(err?.message || 'Failed to load skill details');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <SkillDetailsView skill={skill} loading={loading} error={error} />
    </>
  );
}
