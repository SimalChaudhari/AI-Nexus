import Box from '@mui/material/Box';
import Step from '@mui/material/Step';
import Stack from '@mui/material/Stack';
import Stepper from '@mui/material/Stepper';
import { styled } from '@mui/material/styles';
import StepLabel, { stepLabelClasses } from '@mui/material/StepLabel';
import MuiStepConnector, { stepConnectorClasses } from '@mui/material/StepConnector';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const StepConnector = styled(MuiStepConnector)(({ theme }) => ({
  top: 14,
  left: 'calc(-50% + 20px)',
  right: 'calc(50% + 20px)',
  [`& .${stepConnectorClasses.line}`]: {
    borderTopWidth: 2,
    borderColor: theme.vars.palette.grey[400],
    borderRadius: 999,
    opacity: 0.7,
    transition: 'border-color 220ms ease',
  },
  [`&.${stepConnectorClasses.active}, &.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: { borderColor: theme.vars.palette.primary.main },
  },
}));

// ----------------------------------------------------------------------

export function CheckoutSteps({ steps, activeStep, sx, ...other }) {
  return (
    <Box
      sx={{
        py: { xs: 0.25, md: 0.5 },
        ...sx,
      }}
    >
      <Stepper
        alternativeLabel
        activeStep={activeStep}
        connector={<StepConnector />}
        sx={{
          mb: 0,
          px: { xs: 0.25, md: 1 },
          [`& .${stepLabelClasses.label}`]: {
            mt: 0.75,
            fontWeight: 700,
            fontSize: { xs: 12, sm: 13, md: 14 },
            color: 'text.secondary',
          },
          [`& .${stepLabelClasses.label}.${stepLabelClasses.active}`]: {
            color: 'primary.main',
          },
          [`& .${stepLabelClasses.label}.${stepLabelClasses.completed}`]: {
            color: 'secondary.main',
          },
        }}
        {...other}
      >
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel StepIconComponent={StepIcon}>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
}

function StepIcon({ active, completed }) {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      sx={{
        width: { xs: 24, sm: 26, md: 28 },
        height: { xs: 24, sm: 26, md: 28 },
        borderRadius: '50%',
        color: 'text.disabled',
        bgcolor: 'background.paper',
        border: { xs: '1.5px solid currentColor', md: '2px solid currentColor' },
        transition: 'all 220ms ease',
        ...(active && {
          color: 'primary.main',
          bgcolor: 'background.paper',
          transform: 'scale(1.06)',
          boxShadow: (theme) => `0 0 0 4px ${theme.palette.primary.lighter}`,
        }),
        ...(completed && {
          color: 'primary.main',
          bgcolor: 'background.paper',
        }),
      }}
    >
      {completed ? (
        <Iconify icon="eva:checkmark-fill" sx={{ color: 'primary.main' }} />
      ) : (
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: 'currentColor',
          }}
        />
      )}
    </Stack>
  );
}
