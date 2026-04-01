import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { CONFIG } from 'src/config-global';
import { languageService } from 'src/services/language.service';
import { fetchLanguages } from 'src/store/slices/languageSlice';

import Button from '@mui/material/Button';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { DashboardContent } from 'src/layouts/dashboard';
import { LanguageEditView } from 'src/sections/dashboard/language/view';
import { LoadingScreen } from 'src/components/loading-screen';
import { EmptyContent } from 'src/components/empty-content';
import { Iconify } from 'src/components/iconify';

const metadata = { title: `Language edit | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const params = useParams();
  const dispatch = useDispatch();
  const { languages, loading } = useSelector((state) => state.languages);
  const currentLanguage = languages.find((l) => String(l.id) === String(params.id));
  const [fetched, setFetched] = useState(null);

  useEffect(() => {
    dispatch(fetchLanguages());
  }, [dispatch]);

  useEffect(() => {
    if (!currentLanguage && params.id) {
      languageService
        .getById(params.id)
        .then(setFetched)
        .catch(() => setFetched(null));
    }
  }, [currentLanguage, params.id]);

  const language = currentLanguage ?? fetched;
  const waitingForData = (loading && !currentLanguage) || (params.id && !language && fetched === undefined);

  if (waitingForData) {
    return <LoadingScreen />;
  }

  if (params.id && !language) {
    return (
      <DashboardContent sx={{ pt: 5 }}>
        <EmptyContent
          filled
          title="Language not found"
          action={
            <Button
              component={RouterLink}
              href={paths.admin.language.list}
              startIcon={<Iconify icon="eva:arrow-ios-back-fill" width={16} />}
              sx={{ mt: 3 }}
            >
              Back to list
            </Button>
          }
          sx={{ py: 10, height: 'auto', flexGrow: 'unset' }}
        />
      </DashboardContent>
    );
  }

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <LanguageEditView language={language} />
    </>
  );
}
