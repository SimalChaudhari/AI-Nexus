import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

import { AllCourses } from './all-courses';
import { MyProgress } from './my-progress';
import { MyCertificates } from './my-certificates';
import { MyFavorites } from './my-favorites';
import { DashboardContent } from 'src/layouts/dashboard';
import { useAuthContext } from 'src/auth/hooks';
import { LearningProfileSetupDialog } from './components/learning-profile-setup-dialog';

// ----------------------------------------------------------------------

export function LearningMainSection({ activeTab: activeTabProp, setActiveTab: setActiveTabProp }) {
  const theme = useTheme();
  const { authenticated, user, checkUserSession } = useAuthContext();
  const [internalTab, setInternalTab] = useState('courses');
  const [profileSetupCompleted, setProfileSetupCompleted] = useState(false);
  const [coursesRefreshSignal, setCoursesRefreshSignal] = useState(0);
  const activeTab = activeTabProp ?? internalTab;
  const setActiveTab = setActiveTabProp ?? setInternalTab;
  const shouldOpenProfileDialog = useMemo(() => {
    if (!authenticated) return false;
    if (profileSetupCompleted) return false;
    const missingExperience = !String(user?.aiExperienceLevel || '').trim();
    const missingGoals = !Array.isArray(user?.aiLearningGoals) || user.aiLearningGoals.length === 0;
    const missingAreas = !Array.isArray(user?.aiUseAreas) || user.aiUseAreas.length === 0;
    const missingRole = !String(user?.financeRole || user?.persona || '').trim();
    return missingExperience || missingGoals || missingAreas || missingRole;
  }, [authenticated, user, profileSetupCompleted]);

  useEffect(() => {
    setProfileSetupCompleted(false);
  }, [user?.id]);

  return (
    <DashboardContent
      component="main"
      sx={{
        py: 3,
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* All Courses View */}
      {activeTab === 'courses' && <AllCourses refreshSignal={coursesRefreshSignal} />}

      {/* My Progress View */}
      {activeTab === 'progress' && <MyProgress onNavigateToCertificates={() => setActiveTab('certificates')} />}

      {/* Favorites View */}
      {activeTab === 'favorites' && <MyFavorites />}

      {/* Certificates View */}
      {activeTab === 'certificates' && <MyCertificates />}

      <LearningProfileSetupDialog
        open={shouldOpenProfileDialog}
        user={user}
        onSaved={async () => {
          await checkUserSession();
          setCoursesRefreshSignal((prev) => prev + 1);
          setProfileSetupCompleted(true);
        }}
      />
    </DashboardContent>
  );
}
