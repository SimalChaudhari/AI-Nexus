import { useState } from 'react';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

import { AllCourses } from './all-courses';
import { MyProgress } from './my-progress';
import { MyCertificates } from './my-certificates';
import { MyFavorites } from './my-favorites';
import { DashboardContent } from 'src/layouts/dashboard';

// ----------------------------------------------------------------------

export function LearningMainSection({ activeTab: activeTabProp, setActiveTab: setActiveTabProp }) {
  const theme = useTheme();
  const [internalTab, setInternalTab] = useState('courses');
  const [coursesRefreshSignal] = useState(0);
  const activeTab = activeTabProp ?? internalTab;
  const setActiveTab = setActiveTabProp ?? setInternalTab;

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

      {/* Purchased / enrolled courses only */}
      {activeTab === 'my-courses' && <AllCourses refreshSignal={coursesRefreshSignal} enrolledOnly />}

      {/* My Progress View */}
      {activeTab === 'progress' && <MyProgress onNavigateToCertificates={() => setActiveTab('certificates')} />}

      {/* Favorites View */}
      {activeTab === 'favorites' && <MyFavorites />}

      {/* Certificates View */}
      {activeTab === 'certificates' && <MyCertificates />}

    </DashboardContent>
  );
}
