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
import {
  getExperiencedMemberTypeLabel,
  isExperiencedMembershipApplicationPathway,
  RECORD_TYPE_EXPERIENCED_APPLICATION,
} from 'src/utils/membership-application-pathway';

// ----------------------------------------------------------------------

const fieldSize = 'medium';

export function MembershipApplicationCreateSection({
  application,
  accountId,
  applicationId,
  pathway,
  fieldErrors = {},
  onUpdate,
}) {
  const isExperienced = isExperiencedMembershipApplicationPathway(pathway);
  const update = (field, value) => onUpdate(field, value);
  const created = Boolean(applicationId?.trim());
  const fe = (key) => {
    const msg = fieldErrors[key];
    return msg ? { error: true, helperText: msg } : {};
  };
  const experiencedMemberTypeLabel = getExperiencedMemberTypeLabel(application.experiencedMemberType);

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
            value={
              application.recordTypeName
              || (isExperienced ? RECORD_TYPE_EXPERIENCED_APPLICATION : RECORD_TYPE_CA_APPLICATION)
            }
            disabled
          />
        </Grid>
        {isExperienced ? (
          experiencedMemberTypeLabel ? (
            <Grid item xs={12} md={6}>
              <MembershipFormTextField
                label="Pathway member type"
                size={fieldSize}
                fullWidth
                value={experiencedMemberTypeLabel}
                disabled
                helperText="Selected during eligibility check"
              />
            </Grid>
          ) : null
        ) : (
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
              {...fe('accountingQualification')}
            >
              {ACCOUNTING_QUALIFICATION_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </MembershipFormTextField>
          </Grid>
        )}
      </Grid>

      {created && (
        <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
          Application already created in Salesforce. Submit this section to continue to Personal details,
          or open the Personal tab directly.
        </Typography>
      )}
    </Stack>
  );
}
