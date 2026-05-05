import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import List from '@mui/material/List';
import Avatar from '@mui/material/Avatar';
import Rating from '@mui/material/Rating';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import ListItem from '@mui/material/ListItem';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';
import { alpha } from '@mui/material/styles';

import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import { Iconify } from 'src/components/iconify';
import { getCourseDefaultImage } from 'src/utils/course-default-image';

export function AppTopRatedCourses({ title, subheader, list, sx, ...other }) {
  const router = useRouter();
  const hasCourses = Array.isArray(list) && list.length > 0;
  const defaultCourseImage = getCourseDefaultImage();

  return (
    <Card
      {...other}
      sx={[
        { height: 1, display: 'flex', flexDirection: 'column' },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <CardHeader title={title} subheader={subheader} />

      <List sx={{ py: 0, flex: 1 }}>
        {hasCourses ? (
          list.map((course, index) => (
            <Box key={course.id}>
              {index !== 0 && <Divider />}

              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => router.push(paths.admin.course.details(course.id))}
                  sx={{ py: 1.5, px: 2 }}
                >
                  <Avatar
                    variant="rounded"
                    src={course.image || defaultCourseImage}
                    alt={course.title}
                    sx={{ width: 48, height: 48, mr: 2 }}
                  />

                  <ListItemText
                    primary={
                      <Typography variant="subtitle2" noWrap>
                        {course.title}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ mt: 0.25, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Rating
                          value={Number(course.avgRating || 0)}
                          precision={0.1}
                          readOnly
                          size="small"
                        />
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {Number(course.avgRating || 0).toFixed(1)} ({course.ratingCount || 0})
                        </Typography>
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            </Box>
          ))
        ) : (
          <ListItem sx={{ flex: 1, p: 2.5 }}>
            <Stack
              spacing={1.25}
              alignItems="center"
              justifyContent="center"
              sx={(theme) => ({
                width: 1,
                minHeight: 180,
                borderRadius: 2,
                px: 2,
                textAlign: 'center',
                border: `1px dashed ${theme.palette.divider}`,
                bgcolor:
                  theme.palette.mode === 'dark'
                    ? alpha(theme.palette.grey[500], 0.12)
                    : alpha(theme.palette.grey[500], 0.06),
              })}
            >
              <Box
                sx={(theme) => ({
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'primary.main',
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                })}
              >
                <Iconify icon="solar:star-bold-duotone" width={28} />
              </Box>

              <Typography variant="subtitle2">No top rated course found</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Once learners submit reviews, top courses will appear here.
              </Typography>
            </Stack>
          </ListItem>
        )}
      </List>
    </Card>
  );
}

