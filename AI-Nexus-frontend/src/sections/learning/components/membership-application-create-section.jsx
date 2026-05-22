import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import { MembershipFormTextField } from 'src/components/membership-form-textfield';
import { MembershipFormSectionTitleBlock } from 'src/components/membership-form-section-title';
import Typography from '@mui/material/Typography';

import {
  ACCOUNTING_QUALIFICATION_OPTIONS,
  RECORD_TYPE_CA_APPLICATION,
} from 'src/utils/membership-application-create';

// ----------------------------------------------------------------------

const fieldSize = 'medium';

export function MembershipApplicationCreateSection({
  application,
  accountId,
  applicationId,
  onUpdate,
}) {
  const update = (field, value) => onUpdate(field, value);
  const created = Boolean(applicationId?.trim());

  return (
    <Stack spacing={3}>
      <Alert severity="info">
        Create your Salesforce application record first. The application ID returned here is
        required for all following tabs.
      </Alert>

      <MembershipFormSectionTitleBlock title="Application details" firstSection />

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <MembershipFormTextField
            label="Account ID"
            size={fieldSize}
            fullWidth
            value={accountId || ''}
            disabled
            helperText="From your Eservices sign-in"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <MembershipFormTextField
            label="Application ID"
            size={fieldSize}
            fullWidth
            value={applicationId || ''}
            disabled
            placeholder="Created after you submit this section"
            helperText={created ? 'Use this ID on all subsequent tabs' : 'Submit this section to generate'}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <MembershipFormTextField
            label="Record type"
            size={fieldSize}
            fullWidth
            value={application.recordTypeName || RECORD_TYPE_CA_APPLICATION}
            disabled
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <MembershipFormTextField
            select
            label="Accounting qualification"
            required
            size={fieldSize}
            fullWidth
            disabled={created}
            value={application.accountingQualification}
            onChange={(e) => update('accountingQualification', e.target.value)}
          >
            {ACCOUNTING_QUALIFICATION_OPTIONS.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </MembershipFormTextField>
        </Grid>
      </Grid>

      {created && (
        <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
          Application created. Continue to Personal details.
        </Typography>
      )}
    </Stack>
  );
}
