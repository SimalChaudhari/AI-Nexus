import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import { MembershipFormTextField } from 'src/components/membership-form-textfield';
import { MembershipFormPhoneField } from 'src/components/membership-form-phone-field';
import { MembershipFormSectionTitleBlock } from 'src/components/membership-form-section-title';

// ----------------------------------------------------------------------

const fieldSize = 'medium';

export function MembershipApplicationCharacterReferenceSection({
  characterReference,
  applicationId,
  onUpdate,
}) {
  const update = (field, value) => onUpdate(field, value);

  return (
    <Stack spacing={3}>
      {!applicationId && (
        <Alert severity="warning">
          Submit the Application tab first to obtain an application ID.
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
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <MembershipFormTextField
            label="Name of accountancy body (Salesforce ID)"
            size={fieldSize}
            fullWidth
            value={characterReference.firstReferenceNameOfAccountancyBody}
            onChange={(e) => update('firstReferenceNameOfAccountancyBody', e.target.value)}
            helperText="Record ID from Salesforce, if applicable"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <MembershipFormTextField
            label="Membership ID"
            size={fieldSize}
            fullWidth
            value={characterReference.firstReferenceMembershipId}
            onChange={(e) => update('firstReferenceMembershipId', e.target.value)}
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
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <MembershipFormTextField
            label="Reference type"
            size={fieldSize}
            fullWidth
            value={characterReference.secondReferenceType}
            onChange={(e) => update('secondReferenceType', e.target.value)}
            placeholder="e.g. Present Employer"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <MembershipFormTextField
            label="Company name"
            size={fieldSize}
            fullWidth
            value={characterReference.secondReferenceCompanyName}
            onChange={(e) => update('secondReferenceCompanyName', e.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <MembershipFormTextField
            label="Position / title"
            size={fieldSize}
            fullWidth
            value={characterReference.secondReferencePositionTitle}
            onChange={(e) => update('secondReferencePositionTitle', e.target.value)}
          />
        </Grid>
      </Grid>
    </Stack>
  );
}
