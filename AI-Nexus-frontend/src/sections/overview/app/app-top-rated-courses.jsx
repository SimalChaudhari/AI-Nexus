import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import List from '@mui/material/List';
import Avatar from '@mui/material/Avatar';
import Rating from '@mui/material/Rating';
import Divider from '@mui/material/Divider';
import ListItem from '@mui/material/ListItem';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';

import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';

export function AppTopRatedCourses({ title, subheader, list, ...other }) {
  const router = useRouter();

  return (
    <Card {...other}>
      <CardHeader title={title} subheader={subheader} />

      <List sx={{ py: 0 }}>
        {list.map((course, index) => (
          <Box key={course.id}>
            {index !== 0 && <Divider />}

            <ListItem disablePadding>
              <ListItemButton
                onClick={() => router.push(paths.admin.course.details(course.id))}
                sx={{ py: 1.5, px: 2 }}
              >
                <Avatar
                  variant="rounded"
                  src={course.image || '/assets/images/cover/cover-1.jpg'}
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
        ))}
      </List>
    </Card>
  );
}

