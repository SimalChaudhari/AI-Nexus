import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { CONFIG } from 'src/config-global';
import { languageService } from 'src/services/language.service';
import { fetchLanguages } from 'src/store/slices/languageSlice';

import { LanguageDetailsView } from 'src/sections/dashboard/language/view';
import { LoadingScreen } from 'src/components/loading-screen';

const metadata = { title: `Language details | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const params = useParams();
  const dispatch = useDispatch();
  const [language, setLanguage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    dispatch(fetchLanguages());
    if (params.id) {
      languageService
        .getById(params.id)
        .then((data) => {
          setLanguage(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err?.message || 'Not found');
          setLoading(false);
        });
    }
  }, [dispatch, params.id]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <LanguageDetailsView language={language} loading={loading} error={error} />
    </>
  );
}
