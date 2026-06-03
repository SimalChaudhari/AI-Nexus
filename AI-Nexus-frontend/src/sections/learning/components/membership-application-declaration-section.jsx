import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import { MembershipFormTextField } from 'src/components/membership-form-textfield';
import { MembershipFormSectionTitleBlock } from 'src/components/membership-form-section-title';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';

import { YES_NO_OPTIONS } from 'src/utils/membership-application-declaration';

// ----------------------------------------------------------------------

const fieldSize = 'medium';

const acknowledgementLabelSx = {
  m: 0,
  width: '100%',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 1,
  '& .MuiCheckbox-root': {
    flexShrink: 0,
    p: 0.75,
  },
  '& .MuiFormControlLabel-label': {
    flex: 1,
    margin: 0,
    lineHeight: 1.5,
  },
};

function YesNoField({ label, value, onChange }) {
  return (
    <MembershipFormTextField
      select
      label={label}
      required
      size={fieldSize}
      fullWidth
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {YES_NO_OPTIONS.map((opt) => (
        <MenuItem key={opt} value={opt}>
          {opt}
        </MenuItem>
      ))}
    </MembershipFormTextField>
  );
}

export function MembershipApplicationDeclarationSection({
  declaration,
  applicationId,
  onUpdate,
}) {
  const update = (field, value) => onUpdate(field, value);

  return (
    <Stack spacing={3} sx={{ width: 1 }}>
      {!applicationId && (
        <Alert severity="warning">
          Submit the Application tab first to obtain an application ID.
        </Alert>
      )}

      <MembershipFormSectionTitleBlock title="Declaration questions" firstSection />

      <YesNoField
        label="Convicted of any criminal offence?"
        value={declaration.convictedOfAnyCriminalOffence}
        onChange={(v) => update('convictedOfAnyCriminalOffence', v)}
      />
      {declaration.convictedOfAnyCriminalOffence === 'Yes' && (
        <MembershipFormTextField
          label="Criminal conviction details"
          required
          multiline
          minRows={2}
          size={fieldSize}
          fullWidth
          value={declaration.criminalConvictionDetails}
          onChange={(e) => update('criminalConvictionDetails', e.target.value)}
        />
      )}

      <YesNoField
        label="Bankruptcy?"
        value={declaration.bankruptcy}
        onChange={(v) => update('bankruptcy', v)}
      />
      {declaration.bankruptcy === 'Yes' && (
        <MembershipFormTextField
          label="Bankruptcy details"
          required
          multiline
          minRows={2}
          size={fieldSize}
          fullWidth
          value={declaration.bankruptcyDetails}
          onChange={(e) => update('bankruptcyDetails', e.target.value)}
        />
      )}

      <YesNoField
        label="Subject of any investigation?"
        value={declaration.subjectOfAnyInvestigation}
        onChange={(v) => update('subjectOfAnyInvestigation', v)}
      />
      {declaration.subjectOfAnyInvestigation === 'Yes' && (
        <MembershipFormTextField
          label="Investigation details"
          required
          multiline
          minRows={2}
          size={fieldSize}
          fullWidth
          value={declaration.investigationDetails}
          onChange={(e) => update('investigationDetails', e.target.value)}
        />
      )}

      <YesNoField
        label="Refused entry to any professional body?"
        value={declaration.refusedEntryToAnyProfessionalBody}
        onChange={(v) => update('refusedEntryToAnyProfessionalBody', v)}
      />
      {declaration.refusedEntryToAnyProfessionalBody === 'Yes' && (
        <MembershipFormTextField
          label="Refused entry details"
          required
          multiline
          minRows={2}
          size={fieldSize}
          fullWidth
          value={declaration.refusedEntryProfessionalBodyDetails}
          onChange={(e) => update('refusedEntryProfessionalBodyDetails', e.target.value)}
        />
      )}

      <YesNoField
        label="Member of ISCA previously?"
        value={declaration.memberOfISCAPreviously}
        onChange={(v) => update('memberOfISCAPreviously', v)}
      />
      {declaration.memberOfISCAPreviously === 'Yes' && (
        <MembershipFormTextField
          label="Previous ISCA membership details"
          required
          multiline
          minRows={2}
          size={fieldSize}
          fullWidth
          value={declaration.previousISCAembershipDetails}
          onChange={(e) => update('previousISCAembershipDetails', e.target.value)}
        />
      )}

      <YesNoField
        label="CPE compliance declaration"
        value={declaration.cpeComplianceDeclaration}
        onChange={(v) => update('cpeComplianceDeclaration', v)}
      />
      {declaration.cpeComplianceDeclaration === 'No' && (
        <MembershipFormTextField
          label="Reason for non-compliance"
          required
          multiline
          minRows={2}
          size={fieldSize}
          fullWidth
          value={declaration.reasonForNonComplianceOther}
          onChange={(e) => update('reasonForNonComplianceOther', e.target.value)}
        />
      )}

      <Box sx={{ pt: 1 }}>
        <MembershipFormSectionTitleBlock title="Acknowledgements" />
        <Stack spacing={1.5}>
          <FormControlLabel
            control={
              <Checkbox
                checked={Boolean(declaration.pdpaPolicy)}
                onChange={(e) => update('pdpaPolicy', e.target.checked)}
              />
            }
            label={
              <Typography variant="body2" component="span">
                I agree to the PDPA policy
              </Typography>
            }
            sx={acknowledgementLabelSx}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={Boolean(declaration.infoIsTrueAndComplete)}
                onChange={(e) => update('infoIsTrueAndComplete', e.target.checked)}
              />
            }
            label={
              <Typography variant="body2" component="span">
                I declare that the information provided is true and complete
              </Typography>
            }
            sx={acknowledgementLabelSx}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={Boolean(declaration.acknowledgeNonRefundableAdmissionFee)}
                onChange={(e) =>
                  update('acknowledgeNonRefundableAdmissionFee', e.target.checked)
                }
              />
            }
            label={
              <Typography variant="body2" component="span">
                I acknowledge the non-refundable admission fee
              </Typography>
            }
            sx={acknowledgementLabelSx}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={Boolean(declaration.transitionalArrangements)}
                onChange={(e) => update('transitionalArrangements', e.target.checked)}
              />
            }
            label={
              <Typography variant="body2" component="span">
                I am applying under transitional arrangements
              </Typography>
            }
            sx={acknowledgementLabelSx}
          />
        </Stack>
      </Box>
    </Stack>
  );
}
