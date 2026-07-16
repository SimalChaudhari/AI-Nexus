import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { alpha, useTheme } from '@mui/material/styles';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { Iconify } from 'src/components/iconify';
import { programService } from 'src/services/program.service';

export function LearningProgramLinkedCourses({ courseId }) {
  const theme = useTheme();
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId) {
      setLoading(false);
      return;
    }
    let active = true;
    programService
      .getProgramByCourseId(courseId)
      .then((data) => {
        if (active) setProgram(data);
      })
      .catch(() => {
        if (active) setProgram(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [courseId]);

  const linkedCourses = program?.linkedCourses || [];
  if (loading || !linkedCourses.length) {
    return null;
  }

  return (
    <Card
      sx={{
        mb: 3,
        p: 2.5,
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.info.main, 0.24)}`,
        bgcolor: alpha(theme.palette.info.main, 0.04),
      }}
    >
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          <Iconify icon="solar:layers-bold-duotone" width={22} sx={{ color: 'info.main' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Part of programme: {program.title}
          </Typography>
        </Stack>

        <Typography variant="body2" color="text.secondary">
          These courses are connected as one programme.
        </Typography>

        <Stack spacing={1}>
          {linkedCourses.map((course) => {
            const isCurrent = course.id === courseId;
            return (
              <Box
                key={course.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  py: 0.75,
                  px: 1.25,
                  borderRadius: 1,
                  bgcolor: isCurrent ? alpha(theme.palette.info.main, 0.12) : 'transparent',
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: isCurrent ? 700 : 500 }} noWrap>
                    {course.title}
                  </Typography>
                  {course.categoryTitle ? (
                    <Typography variant="body2" color="text.secondary" noWrap>
                      ({course.categoryTitle})
                    </Typography>
                  ) : null}
                  {isCurrent ? (
                    <Chip size="small" label="You are here" color="info" variant="soft" />
                  ) : null}
                </Stack>
                {!isCurrent ? (
                  <Button
                    component={RouterLink}
                    href={paths.learningCourse.details(course.id)}
                    size="small"
                    variant="outlined"
                  >
                    View
                  </Button>
                ) : null}
              </Box>
            );
          })}
        </Stack>
      </Stack>
    </Card>
  );
}
