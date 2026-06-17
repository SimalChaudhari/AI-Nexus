import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import { MembershipFormTextField } from 'src/components/membership-form-textfield';
import { MembershipFormPhoneField } from 'src/components/membership-form-phone-field';
import { MembershipFormSectionTitleBlock } from 'src/components/membership-form-section-title';

import { isExperiencedMembershipApplicationPathway } from 'src/utils/membership-application-pathway';
import {
  MEMBERSHIP_PICKLIST_CONFIG,
  MembershipApplicationPicklistField,
  useMembershipPicklist,
  useMembershipAccountancyBodyNames,
} from 'src/sections/learning/membership-application-picklists';

// ----------------------------------------------------------------------

const fieldSize = 'medium';

export function MembershipApplicationCharacterReferenceSection({
  characterReference,
  applicationId,
  pathway,
  fieldErrors = {},
  onUpdate,
}) {
  const isExperienced = isExperiencedMembershipApplicationPathway(pathway);
  const update = (field, value) => onUpdate(field, value);
  const fe = (key) => {
    const msg = fieldErrors[key];
    return msg ? { error: true, helperText: msg } : {};
  };
  const characterReferenceTypePicklist = useMembershipPicklist({
    enabled: !isExperienced,
    ...MEMBERSHIP_PICKLIST_CONFIG.characterReferenceType,
  });
  const accountancyBodyNamesPicklist = useMembershipAccountancyBodyNames({
    enabled: !isExperienced,
    emptyErrorMessage: 'Accountancy body options were not returned from Salesforce.',
  });

  return (
    <Stack spacing={3}>
      {!applicationId && (
        <Alert severity="warning">
          Submit the Application tab first to obtain an application ID.
        </Alert>
      )}

      {!isExperienced && characterReferenceTypePicklist.error && (
        <Alert
          severity="error"
          action={
            <Button size="small" color="inherit" onClick={characterReferenceTypePicklist.retry}>
              Retry
            </Button>
          }
        >
          {characterReferenceTypePicklist.error}
        </Alert>
      )}

      {!isExperienced && accountancyBodyNamesPicklist.error && (
        <Alert
          severity="error"
          action={
            <Button size="small" color="inherit" onClick={accountancyBodyNamesPicklist.retry}>
              Retry
            </Button>
          }
        >
          {accountancyBodyNamesPicklist.error}
        </Alert>
      )}

      <MembershipFormSectionTitleBlock
        title="First reference (accountancy body member)"
        firstSection
      />
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <MembershipFormTextField
            label="Name"
            required
            size={fieldSize}
            fullWidth
            value={characterReference.firstReferenceName}
            onChange={(e) => update('firstReferenceName', e.target.value)}
            {...fe('firstReferenceName')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MembershipFormTextField
            label="Years known"
            required
            type="number"
            size={fieldSize}
            fullWidth
            inputProps={{ min: 0 }}
            value={characterReference.firstReferenceYearsKnown}
            onChange={(e) => update('firstReferenceYearsKnown', e.target.value)}
            {...fe('firstReferenceYearsKnown')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MembershipFormTextField
            label="Relationship"
            required
            size={fieldSize}
            fullWidth
            value={characterReference.firstReferenceRelationship}
            onChange={(e) => update('firstReferenceRelationship', e.target.value)}
            {...fe('firstReferenceRelationship')}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <MembershipFormPhoneField
            label="Contact no."
            required
            numberType="number"
            size={fieldSize}
            lockDialCode
            countryCode={characterReference.firstReferenceCountryCode}
            number={characterReference.firstReferenceContactNo}
            onCountryCodeChange={(e) => update('firstReferenceCountryCode', e.target.value)}
            onNumberChange={(e) => update('firstReferenceContactNo', e.target.value)}
            {...fe('firstReferenceContactNo')}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <MembershipFormTextField
            label="Email address"
            required
            type="email"
            size={fieldSize}
            fullWidth
            value={characterReference.firstReferenceEmailAddress}
            onChange={(e) => update('firstReferenceEmailAddress', e.target.value)}
            {...fe('firstReferenceEmailAddress')}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          {!isExperienced ? (
            <MembershipApplicationPicklistField
              label="Name of accountancy body"
              required
              size={fieldSize}
              value={characterReference.firstReferenceNameOfAccountancyBody}
              onChange={(e) => update('firstReferenceNameOfAccountancyBody', e.target.value)}
              options={accountancyBodyNamesPicklist.options}
              loading={accountancyBodyNamesPicklist.loading}
              onOpen={accountancyBodyNamesPicklist.load}
              fieldProps={fe('firstReferenceNameOfAccountancyBody')}
            />
          ) : (
            <MembershipFormTextField
              label="Name of accountancy body (Salesforce ID)"
              required
              size={fieldSize}
              fullWidth
              value={characterReference.firstReferenceNameOfAccountancyBody}
              onChange={(e) => update('firstReferenceNameOfAccountancyBody', e.target.value)}
              {...fe('firstReferenceNameOfAccountancyBody')}
            />
          )}
        </Grid>
        <Grid item xs={12} md={6}>
          <MembershipFormTextField
            label="Membership ID"
            required
            size={fieldSize}
            fullWidth
            value={characterReference.firstReferenceMembershipId}
            onChange={(e) => update('firstReferenceMembershipId', e.target.value)}
            {...fe('firstReferenceMembershipId')}
          />
        </Grid>
      </Grid>

      <MembershipFormSectionTitleBlock title="Second reference" />
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <MembershipFormTextField
            label="Name"
            required
            size={fieldSize}
            fullWidth
            value={characterReference.secondReferenceName}
            onChange={(e) => update('secondReferenceName', e.target.value)}
            {...fe('secondReferenceName')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MembershipFormTextField
            label="Years known"
            required
            type="number"
            size={fieldSize}
            fullWidth
            inputProps={{ min: 0 }}
            value={characterReference.secondReferenceYearsKnown}
            onChange={(e) => update('secondReferenceYearsKnown', e.target.value)}
            {...fe('secondReferenceYearsKnown')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MembershipFormTextField
            label="Relationship"
            required
            size={fieldSize}
            fullWidth
            value={characterReference.secondReferenceRelationship}
            onChange={(e) => update('secondReferenceRelationship', e.target.value)}
            {...fe('secondReferenceRelationship')}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <MembershipFormPhoneField
            label="Contact no."
            required
            numberType="number"
            size={fieldSize}
            lockDialCode
            countryCode={characterReference.secondReferenceCountryCode}
            number={characterReference.secondReferenceContactNo}
            onCountryCodeChange={(e) => update('secondReferenceCountryCode', e.target.value)}
            onNumberChange={(e) => update('secondReferenceContactNo', e.target.value)}
            {...fe('secondReferenceContactNo')}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <MembershipFormTextField
            label="Email address"
            required
            type="email"
            size={fieldSize}
            fullWidth
            value={characterReference.secondReferenceEmailAddress}
            onChange={(e) => update('secondReferenceEmailAddress', e.target.value)}
            {...fe('secondReferenceEmailAddress')}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          {!isExperienced ? (
            <MembershipApplicationPicklistField
              label="Reference type"
              required
              size={fieldSize}
              value={characterReference.secondReferenceType}
              onChange={(e) => update('secondReferenceType', e.target.value)}
              options={characterReferenceTypePicklist.options}
              loading={characterReferenceTypePicklist.loading}
              onOpen={characterReferenceTypePicklist.load}
              fieldProps={fe('secondReferenceType')}
            />
          ) : (
            <MembershipFormTextField
              label="Reference type"
              required
              size={fieldSize}
              fullWidth
              value={characterReference.secondReferenceType}
              onChange={(e) => update('secondReferenceType', e.target.value)}
              placeholder="e.g. Present Employer"
              {...fe('secondReferenceType')}
            />
          )}
        </Grid>
        <Grid item xs={12} md={6}>
          <MembershipFormTextField
            label="Company name"
            required
            size={fieldSize}
            fullWidth
            value={characterReference.secondReferenceCompanyName}
            onChange={(e) => update('secondReferenceCompanyName', e.target.value)}
            {...fe('secondReferenceCompanyName')}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <MembershipFormTextField
            label="Position / title"
            required
            size={fieldSize}
            fullWidth
            value={characterReference.secondReferencePositionTitle}
            onChange={(e) => update('secondReferencePositionTitle', e.target.value)}
            {...fe('secondReferencePositionTitle')}
          />
        </Grid>
      </Grid>
    </Stack>
  );
}
