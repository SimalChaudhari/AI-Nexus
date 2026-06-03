import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';

import { MembershipFormSectionTitleBlock } from 'src/components/membership-form-section-title';
import { RESIDENTIAL_DECLARATION_OPTIONS } from 'src/utils/membership-application-residential-declaration';

// ----------------------------------------------------------------------

const optionLabelSx = {
  m: 0,
  width: '100%',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 1,
  '& .MuiRadio-root': {
    flexShrink: 0,
    p: 0.75,
  },
  '& .MuiFormControlLabel-label': {
    flex: 1,
    margin: 0,
    lineHeight: 1.5,
  },
};

export function MembershipApplicationResidentialDeclarationSection({
  residentialDeclaration,
  applicationId,
  onUpdate,
}) {
  const selectedValue = residentialDeclaration.residentialDeclaration || '';

  return (
    <Stack spacing={3} sx={{ width: 1 }}>
      {!applicationId && (
        <Alert severity="warning">
          Submit the Application tab first to obtain an application ID.
        </Alert>
      )}

      <MembershipFormSectionTitleBlock title="Residential declaration" firstSection />

      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
        At the point of payment, please declare if your usual place of residence is outside of
        Singapore. The GST amount will be zero-rated if you declare that you reside overseas.
      </Typography>

      <Box>
        <RadioGroup
          value={selectedValue}
          onChange={(e) => onUpdate('residentialDeclaration', e.target.value)}
          sx={{ gap: 1.5 }}
        >
          {RESIDENTIAL_DECLARATION_OPTIONS.map((option) => (
            <FormControlLabel
              key={option.value}
              value={option.value}
              control={<Radio />}
              label={
                <Typography variant="body2" component="span" sx={{ color: 'text.primary' }}>
                  {option.label}
                </Typography>
              }
              sx={optionLabelSx}
            />
          ))}
        </RadioGroup>
      </Box>
    </Stack>
  );
}
