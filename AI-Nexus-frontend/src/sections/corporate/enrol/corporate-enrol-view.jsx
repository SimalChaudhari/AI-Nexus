import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { useRouter } from 'src/routes/hooks';

import { Form, Field } from 'src/components/hook-form';
import { toast } from 'src/components/snackbar';
import { useAuthContext } from 'src/auth/hooks';
import {
  enrolCorporateStaff,
  submitCorporateForeignQuotationRequest,
} from 'src/services/corporate.service';
import {
  CorporateEnrolSchema,
  corporateEnrolDefaultValues,
} from 'src/validations/corporate-enrol.validation';
import {
  CorporateForeignQuotationSchema,
  corporateForeignQuotationDefaultValues,
} from 'src/validations/corporate-foreign-quotation.validation';

import { CORP } from '../corporate-theme';
import { CorpBtn, CorpCard, CorpPageHeader } from '../corporate-ui';
import { useCorporateCompanyCode } from '../use-corporate-data';
import { CorporateCsvUploadDialog } from './corporate-csv-upload-dialog';

// ----------------------------------------------------------------------

const fieldSx = {
  width: '100%',
  minWidth: 0,
  '& .MuiOutlinedInput-root': {
    borderRadius: '14px',
    bgcolor: 'white',
    mt: 0.75,
    minWidth: 0,
    '& fieldset': { borderColor: CORP.line },
    '& input, & .MuiSelect-select': {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
  },
  '& .MuiInputLabel-root': {
    position: 'static',
    transform: 'none',
    fontWeight: 700,
    fontSize: 13,
    color: '#344256',
    mb: 0,
  },
  '& .MuiFormHelperText-root': {
    mx: 0,
    mt: 0.5,
  },
};

const formGridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
  gap: { xs: 1.5, md: 1.75 },
  width: '100%',
  minWidth: 0,
};

const checkboxLabelSx = {
  alignItems: 'flex-start',
  m: 0,
  gap: 0.5,
  width: '100%',
  '& .MuiCheckbox-root': {
    pt: 0.15,
    flexShrink: 0,
  },
  '& .MuiFormControlLabel-label': {
    fontSize: { xs: 12.5, sm: 13 },
    lineHeight: 1.5,
    color: CORP.ink,
    wordBreak: 'break-word',
  },
};

function FieldLabel({ label, children, wide, required }) {
  return (
    <Box sx={{ gridColumn: wide ? '1 / -1' : 'auto', minWidth: 0, width: '100%' }}>
      <Typography
        component="div"
        sx={{
          fontWeight: 700,
          fontSize: { xs: 12.5, sm: 13 },
          color: '#344256',
          mb: 0.75,
          lineHeight: 1.35,
          wordBreak: 'break-word',
          display: 'block',
        }}
      >
        {label}
        {required ? (
          <Box component="span" sx={{ color: '#d32f2f', ml: 0.25 }}>
            *
          </Box>
        ) : null}
      </Typography>
      {children}
    </Box>
  );
}

function buildEnrolPayload(form) {
  const first_name = String(form.firstName || '').trim();
  const last_name = String(form.lastName || '').trim();
  const name_as_per_id =
    String(form.nameAsPerId || '').trim() || `${first_name} ${last_name}`.trim();
  const email = String(form.email || '').trim();
  const payload = {
    salutation: String(form.salutation || '').trim() || undefined,
    first_name,
    last_name,
    name_as_per_id,
    email,
  };

  const idType = String(form.idType || '').trim();
  if (idType) payload.id_type = idType;

  const idNumber = String(form.idNumber || '').trim();
  if (idNumber) payload.id_number = idNumber;

  const company = String(form.company || '').trim();
  if (company) payload.company = company;

  const department = String(form.department || '').trim();
  if (department) payload.department = department;

  const jobFunction = String(form.jobFunction || '').trim();
  if (jobFunction) payload.jobFunction = jobFunction;

  const countryOfResidence = String(form.countryOfResidence || '').trim();
  if (countryOfResidence) payload.countryOfResidence = countryOfResidence;

  const yearsRaw = String(form.yearsOfExperience || '').trim();
  if (yearsRaw !== '') {
    const years = Number(yearsRaw);
    if (!Number.isNaN(years)) payload.noOfYearOfRelevantWorkExperience = years;
  }

  const corporateAccountId = String(form.corporateAccountId || '').trim();
  if (corporateAccountId) payload.corporateAccountId = corporateAccountId;

  const learnerAsAnAccounting = String(form.learnerAsAnAccounting || '').trim();
  if (learnerAsAnAccounting) payload.learnerAsAnAccounting = learnerAsAnAccounting;

  const membershipNumber = String(form.membershipNumber || '').trim();
  if (membershipNumber) payload.membershipNumber = membershipNumber;

  const eligibility = String(form.eligibility || '').trim();
  if (eligibility) payload.eligibility = eligibility;

  payload.isAuthorisedSubmit = true;

  return payload;
}

function formatApiErrorMessage(err, fallback) {
  const raw = err?.response?.data?.message ?? err?.message ?? fallback;
  const text = Array.isArray(raw) ? raw.filter(Boolean).join(', ') : String(raw || fallback);
  const trimmed = text.trim() || fallback;
  if (trimmed.length <= 220) return trimmed;
  return `${trimmed.slice(0, 217)}…`;
}

function getEnrolSkipRows(result) {
  const fromSkipped = Array.isArray(result?.skipped) ? result.skipped : [];
  if (fromSkipped.length) {
    return fromSkipped
      .map((row) => ({
        email: String(row?.email || '').trim(),
        step: String(row?.step || '').trim(),
        reason: String(row?.reason || '').trim(),
      }))
      .filter((row) => row.email || row.reason);
  }

  const fromRows = Array.isArray(result?.rows) ? result.rows : [];
  return fromRows
    .filter((row) => String(row?.status || '').toLowerCase() === 'skipped')
    .map((row) => ({
      email: String(row?.email || '').trim(),
      step: String(row?.step || '').trim(),
      reason: String(row?.reason || '').trim(),
    }))
    .filter((row) => row.email || row.reason);
}

function formatSkipReasonLine(row) {
  const email = row.email || 'Learner';
  const reason = row.reason || 'Skipped.';
  return `${email}: ${reason}`;
}

function buildEnrolFailureToastMessage(result, skippedList, skipped, total) {
  const firstReason = skippedList.find((row) => row.reason)?.reason;
  const firstEmail = skippedList.find((row) => row.email)?.email;
  const trackHint = result?.batchId ? ' See Enrol Track for details.' : '';

  if (skippedList.length === 1 && firstReason) {
    const line = firstEmail ? `${firstEmail}: ${firstReason}` : firstReason;
    if (line.length <= 280) return line;
    return `${line.slice(0, 277)}…`;
  }

  if (firstReason) {
    const prefix =
      skipped > 0
        ? `No learners enrolled. ${skipped}${total ? ` of ${total}` : ''} row(s) skipped.`
        : result?.message || 'No staff learners were enrolled.';
    const detail = firstEmail ? `${firstEmail}: ${firstReason}` : firstReason;
    const msg = `${prefix} ${detail}${trackHint}`;
    if (msg.length <= 280) return msg;
    return `${msg.slice(0, 277)}…`;
  }

  return skipped > 0
    ? `No learners enrolled. ${skipped}${total ? ` of ${total}` : ''} row(s) skipped.${trackHint}`
    : result?.message || 'No staff learners were enrolled.';
}

/** Toast + optional skip reason from Salesforce / precheck / local. */
function showEnrolResultToast(result, fallbackSuccessMessage) {
  const summary = result?.summary || {};
  const skippedList = getEnrolSkipRows(result);
  const passed = Number(summary.finalPassed ?? 0);
  const skipped = Number(
    summary.finalSkipped ?? (skippedList.length > 0 ? skippedList.length : 0),
  );
  const total = Number(summary.totalReceived ?? passed + skipped);
  const trackHint = result?.batchId ? ' See Enrol Track for details.' : '';

  if (passed <= 0 && (result?.success === false || skipped > 0)) {
    toast.error(buildEnrolFailureToastMessage(result, skippedList, skipped, total));
    return;
  }

  if (skipped > 0) {
    const firstReason = skippedList.find((row) => row.reason)?.reason;
    const extra = firstReason ? ` ${firstReason}` : '';
    const msg = `${passed} enrolled, ${skipped} skipped${total ? ` of ${total}` : ''}.${extra}${trackHint}`;
    toast.warning(msg.length <= 280 ? msg : `${msg.slice(0, 277)}…`);
    return;
  }

  toast.success(result?.message || fallbackSuccessMessage);
}

// ----------------------------------------------------------------------

export function CorporateEnrolView() {
  const router = useRouter();
  const companyCode = useCorporateCompanyCode();
  const { user } = useAuthContext();

  const [authorised, setAuthorised] = useState(false);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [lastEnrolResult, setLastEnrolResult] = useState(null);

  const quotationDefaults = useMemo(() => {
    const contactPerson = [user?.firstname, user?.lastname].filter(Boolean).join(' ').trim();
    return {
      ...corporateForeignQuotationDefaultValues,
      contactPerson,
      contactEmail: String(user?.email || '').trim(),
    };
  }, [user?.email, user?.firstname, user?.lastname]);

  const enrolDefaults = useMemo(() => {
    const sfRaw = user?.salesforceUserInfoRaw;
    const corporate = sfRaw && typeof sfRaw === 'object' ? sfRaw.corporate : null;
    const companyFromSf =
      String(corporate?.accountName || corporate?.companyName || '').trim()
      || String(user?.companyName || user?.company || '').trim();
    return {
      ...corporateEnrolDefaultValues,
      company: companyFromSf,
      corporateAccountId: String(user?.salesforceAccountId || '').trim(),
    };
  }, [user?.company, user?.companyName, user?.salesforceAccountId, user?.salesforceUserInfoRaw]);

  const methods = useForm({
    resolver: zodResolver(CorporateEnrolSchema),
    defaultValues: enrolDefaults,
    mode: 'onTouched',
  });

  const quotationMethods = useForm({
    resolver: zodResolver(CorporateForeignQuotationSchema),
    defaultValues: quotationDefaults,
    mode: 'onTouched',
  });

  useEffect(() => {
    quotationMethods.reset(quotationDefaults);
  }, [quotationDefaults, quotationMethods]);

  useEffect(() => {
    methods.reset(enrolDefaults);
  }, [enrolDefaults, methods]);

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const {
    handleSubmit: handleQuotationSubmit,
    reset: resetQuotation,
    formState: { isSubmitting: isQuotationSubmitting },
  } = quotationMethods;

  const onSubmitIndividual = handleSubmit(async (values) => {
    if (!authorised) {
      toast.error('Please confirm authorisation before submitting enrolment.');
      return;
    }

    try {
      const result = await enrolCorporateStaff(buildEnrolPayload(values), companyCode || undefined);
      setLastEnrolResult(result || null);
      if (result?.success === false) {
        showEnrolResultToast(result, 'Staff learner could not be enrolled');
        return;
      }
      showEnrolResultToast(result, 'Staff learner enrolled successfully');
      reset(enrolDefaults);
      setAuthorised(false);
      if (result?.batchId) {
        // Keep user on page; track link shown in result card.
      }
    } catch (err) {
      toast.error(formatApiErrorMessage(err, 'Failed to enrol staff learner'));
    }
  });

  const handleCsvEnrolSuccess = (result) => {
    setLastEnrolResult(result || null);
    showEnrolResultToast(result, 'Bulk staff enrolment submitted successfully');
    if (result?.batchId) {
      window.setTimeout(() => {
        router.push(paths.corporate.enrolTrackBatch(result.batchId));
      }, 700);
    }
  };

  const onSubmitQuotation = handleQuotationSubmit(async (values) => {
    try {
      const result = await submitCorporateForeignQuotationRequest(
        {
          companyName: values.companyName,
          contactPerson: values.contactPerson,
          contactEmail: values.contactEmail,
          estimatedParticipants: Number(values.estimatedParticipants),
        },
        companyCode || undefined,
      );
      toast.success(
        result?.message || 'Your quotation request has been sent to ISCA. We will contact you shortly.',
      );
      resetQuotation(quotationDefaults);
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || 'Failed to send quotation request';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    }
  });

  return (
    <Box sx={{ width: '100%', minWidth: 0, overflowX: 'hidden' }}>
      <CorporateCsvUploadDialog
        open={csvDialogOpen}
        onClose={() => setCsvDialogOpen(false)}
        companyCode={companyCode}
        onSuccess={handleCsvEnrolSuccess}
      />

      <CorpPageHeader
        eyebrow="Staff Enrolment"
        title="Enrol learners individually or in bulk"
        subtitle="Enrol Singapore Citizen, Singapore PR, or Foreigner learners. Upload CSV/Excel and AI will map messy columns, then staff are created in Salesforce and receive a welcome email from Salesforce to set up login."
        titleSx={{ fontSize: { xs: 22, sm: 26, md: 30 } }}
        titleActions={
          <>
            <CorpBtn
              variant="ghost"
              component={RouterLink}
              href={paths.corporate.enrolTrack}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              Enrolment track
            </CorpBtn>
            <CorpBtn
              variant="blue"
              onClick={() => setCsvDialogOpen(true)}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              Upload CSV
            </CorpBtn>
          </>
        }
      />

      {lastEnrolResult ? (
        <CorpCard sx={{ mb: { xs: 1.75, md: 2.25 }, overflow: 'hidden' }}>
          <Typography sx={{ color: CORP.navy, fontWeight: 700, mb: 0.75, fontSize: { xs: 14, sm: 16 } }}>
            Latest enrolment result
          </Typography>
          <Typography sx={{ color: CORP.muted, mb: 1.25, fontSize: 13, lineHeight: 1.5 }}>
            {lastEnrolResult.message || 'Enrolment finished.'}
            {lastEnrolResult.summary
              ? ` Sent ${lastEnrolResult.summary.totalReceived ?? '—'} · Passed ${lastEnrolResult.summary.finalPassed ?? lastEnrolResult.count ?? 0} · Skipped ${lastEnrolResult.summary.finalSkipped ?? 0}.`
              : null}
          </Typography>
          {getEnrolSkipRows(lastEnrolResult).length ? (
            <Box
              sx={{
                mb: 1.5,
                p: 1.25,
                borderRadius: '12px',
                bgcolor: '#FFF5F5',
                border: '1px solid #FECACA',
              }}
            >
              <Typography sx={{ color: '#991B1B', fontWeight: 700, fontSize: 12.5, mb: 0.75 }}>
                Skipped / failed
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.25, display: 'grid', gap: 0.75 }}>
                {getEnrolSkipRows(lastEnrolResult).map((row) => (
                  <Typography
                    key={`${row.email}-${row.step}-${row.reason}`}
                    component="li"
                    sx={{ color: '#7F1D1D', fontSize: 13, lineHeight: 1.45 }}
                  >
                    {formatSkipReasonLine(row)}
                    {row.step ? (
                      <Box component="span" sx={{ color: '#B91C1C', display: 'block', fontSize: 11.5, mt: 0.25 }}>
                        Step: {row.step}
                      </Box>
                    ) : null}
                  </Typography>
                ))}
              </Box>
            </Box>
          ) : null}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {lastEnrolResult.batchId ? (
              <CorpBtn
                variant="blue"
                component={RouterLink}
                href={paths.corporate.enrolTrackBatch(lastEnrolResult.batchId)}
              >
                View row track
              </CorpBtn>
            ) : null}
            <CorpBtn variant="ghost" component={RouterLink} href={paths.corporate.enrolTrack}>
              All enrolment batches
            </CorpBtn>
          </Box>
        </CorpCard>
      ) : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,1.55fr) minmax(0,.75fr)' },
          gap: { xs: 1.75, md: 2.25 },
          alignItems: 'start',
          width: '100%',
          minWidth: 0,
        }}
      >
        <CorpCard sx={{ overflow: 'hidden' }}>
          <Form methods={methods} onSubmit={onSubmitIndividual}>
            <Typography
              sx={{
                color: CORP.navy,
                fontWeight: 700,
                fontSize: { xs: 16, sm: 18 },
                mb: 1.25,
                wordBreak: 'break-word',
              }}
            >
              Single learner enrolment
            </Typography>
            <Typography
              sx={{
                color: CORP.muted,
                lineHeight: 1.55,
                mb: 2,
                fontSize: { xs: 13, sm: 14 },
              }}
            >
              For Singapore Citizen, Singapore PR, and Foreigner learners. All
              createblukuserfornexus fields are collected below (company and corporate account ID
              are pre-filled from your login when available). Fields marked{' '}
              <Box component="span" sx={{ color: '#d32f2f' }}>
                *
              </Box>{' '}
              are required.
            </Typography>

            <Box sx={formGridSx}>
              <FieldLabel label="Salutation">
                <Field.Select name="salutation" size="small" sx={fieldSx}>
                  <MenuItem value="">
                    <em>Optional</em>
                  </MenuItem>
                  <MenuItem value="Mr">Mr</MenuItem>
                  <MenuItem value="Ms">Ms</MenuItem>
                  <MenuItem value="Mrs">Mrs</MenuItem>
                  <MenuItem value="Dr">Dr</MenuItem>
                </Field.Select>
              </FieldLabel>
              <FieldLabel label="First name" required>
                <Field.Text
                  name="firstName"
                  size="small"
                  placeholder="e.g. Ahmad"
                  sx={fieldSx}
                />
              </FieldLabel>
              <FieldLabel label="Last name" required>
                <Field.Text
                  name="lastName"
                  size="small"
                  placeholder="e.g. Bin Abdullah"
                  sx={fieldSx}
                />
              </FieldLabel>
              <FieldLabel label="Name as per ID" required>
                <Field.Text
                  name="nameAsPerId"
                  size="small"
                  placeholder="e.g. Ahmad Bin Abdullah"
                  sx={fieldSx}
                />
              </FieldLabel>
              <FieldLabel label="Work email" required>
                <Field.Text
                  name="email"
                  type="email"
                  size="small"
                  placeholder="name@company.com"
                  sx={fieldSx}
                />
              </FieldLabel>
              <FieldLabel label="ID type">
                <Field.Select name="idType" size="small" sx={fieldSx}>
                  <MenuItem value="">
                    <em>Optional</em>
                  </MenuItem>
                  <MenuItem value="NRIC">NRIC</MenuItem>
                  <MenuItem value="Blue NRIC">Blue NRIC</MenuItem>
                  <MenuItem value="Pink NRIC">Pink NRIC</MenuItem>
                  <MenuItem value="FIN">FIN</MenuItem>
                  <MenuItem value="Passport">Passport</MenuItem>
                </Field.Select>
              </FieldLabel>
              <FieldLabel label="ID number">
                <Field.Text
                  name="idNumber"
                  size="small"
                  placeholder="e.g. S8901234G (optional)"
                  sx={fieldSx}
                />
              </FieldLabel>
              <FieldLabel label="Company" required>
                <Field.Text
                  name="company"
                  size="small"
                  placeholder="e.g. Maybank"
                  InputProps={{ readOnly: true }}
                  sx={{
                    ...fieldSx,
                    '& .MuiInputBase-root': { bgcolor: 'action.hover' },
                  }}
                />
              </FieldLabel>
              <FieldLabel label="Department">
                <Field.Text
                  name="department"
                  size="small"
                  placeholder="e.g. Banking Operations (optional)"
                  sx={fieldSx}
                />
              </FieldLabel>
              <FieldLabel label="Job function" required>
                <Field.Text
                  name="jobFunction"
                  size="small"
                  placeholder="e.g. Branch Manager"
                  sx={fieldSx}
                />
              </FieldLabel>
              <FieldLabel label="Country of residence">
                <Field.Text
                  name="countryOfResidence"
                  size="small"
                  placeholder="e.g. Singapore (optional)"
                  sx={fieldSx}
                />
              </FieldLabel>
              <FieldLabel label="Years of relevant work experience" required>
                <Field.Text
                  name="yearsOfExperience"
                  size="small"
                  type="number"
                  placeholder="e.g. 14"
                  sx={fieldSx}
                  inputProps={{ min: 0, step: 0.5 }}
                />
              </FieldLabel>
              <FieldLabel label="Corporate account ID" required>
                <Field.Text
                  name="corporateAccountId"
                  size="small"
                  placeholder="e.g. 001fV000002uLIa"
                  InputProps={{ readOnly: true }}
                  sx={{
                    ...fieldSx,
                    '& .MuiInputBase-root': { bgcolor: 'action.hover' },
                  }}
                />
              </FieldLabel>
              <FieldLabel label="Membership number">
                <Field.Text
                  name="membershipNumber"
                  size="small"
                  placeholder="e.g. MEM20260031 (optional)"
                  sx={fieldSx}
                />
              </FieldLabel>
              <FieldLabel label="Eligibility" required>
                <Field.Select name="eligibility" size="small" sx={fieldSx}>
                  <MenuItem value="Singapore Citizen">Singapore Citizen</MenuItem>
                  <MenuItem value="Singapore PR">Singapore PR</MenuItem>
                  <MenuItem value="Foreigner">Foreigner</MenuItem>
                </Field.Select>
              </FieldLabel>
              <FieldLabel label="Learner as an accounting professional" required>
                <Field.Select name="learnerAsAnAccounting" size="small" sx={fieldSx}>
                  <MenuItem value="Yes">Yes</MenuItem>
                  <MenuItem value="No">No</MenuItem>
                </Field.Select>
              </FieldLabel>
            </Box>

            <Box
              sx={{
                my: { xs: 1.75, md: 2.25 },
                p: { xs: 1.5, sm: 2 },
                borderRadius: { xs: '14px', md: '18px' },
                bgcolor: '#f8fbff',
                border: `1px solid ${CORP.line}`,
                minWidth: 0,
                width: '100%',
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={authorised}
                    onChange={(event) => setAuthorised(event.target.checked)}
                  />
                }
                label="I confirm that I am authorised to submit the above information to ISCA for the purposes of learner enrolment, programme administration and participant communications relating to AI Fluency. I declare that the information provided is true, accurate and complete. I acknowledge that if any inaccurate or false information results in ineligible funding or subsidies being applied, ISCA reserves the right to recover the unfunded amount from the company."
                sx={checkboxLabelSx}
              />
            </Box>

            <CorpBtn
              variant="blue"
              fullWidth
              type="submit"
              disabled={isSubmitting || !authorised}
            >
              {isSubmitting ? 'Submitting…' : 'Submit enrolment'}
            </CorpBtn>
          </Form>
        </CorpCard>

        <CorpCard sx={{ overflow: 'hidden' }}>
          <Typography
            sx={{
              color: CORP.navy,
              fontWeight: 700,
              fontSize: { xs: 16, sm: 18 },
              mb: 1.25,
              wordBreak: 'break-word',
            }}
          >
            Bulk enrolment guidance
          </Typography>
          <Typography
            sx={{
              color: CORP.muted,
              lineHeight: 1.55,
              mb: 2,
              fontSize: { xs: 13, sm: 14 },
            }}
          >
            Bulk enrolment supports Singapore Citizen, Singapore PR, and Foreigner learners. Use
            Upload CSV for createblukuserfornexus fields.
          </Typography>

          <Box
            sx={{
              bgcolor: '#fff7ed',
              border: '1px solid #fed7aa',
              borderRadius: { xs: '14px', md: '18px' },
              p: { xs: 1.5, sm: 2 },
              mb: 2.25,
              minWidth: 0,
            }}
          >
            <Typography sx={{ fontWeight: 700, color: CORP.navy, fontSize: { xs: 14, sm: 16 } }}>
              Foreign learner options
            </Typography>
            <Typography
              sx={{
                m: '8px 0 0',
                lineHeight: 1.5,
                fontSize: { xs: 13, sm: 14 },
                color: CORP.ink,
                wordBreak: 'break-word',
              }}
            >
              Select <strong>Foreigner</strong> under Eligibility to enrol foreign learners
              directly. For a custom quotation instead, use the form below or email{' '}
              <Link
                href="mailto:hello@ainexus.isca.org.sg"
                sx={{ color: CORP.blue, wordBreak: 'break-all' }}
              >
                hello@ainexus.isca.org.sg
              </Link>
              .
            </Typography>
          </Box>

          <Box sx={{ color: CORP.muted, mb: 2, minWidth: 0 }}>
            <Typography
              sx={{
                mb: 1,
                color: CORP.ink,
                fontWeight: 700,
                fontSize: { xs: 13, sm: 14 },
                wordBreak: 'break-word',
              }}
            >
              Before uploading a bulk enrolment file, please ensure that:
            </Typography>
            <Box
              component="ul"
              sx={{
                pl: { xs: 2.25, sm: 2.75 },
                m: 0,
                lineHeight: 1.7,
                fontSize: { xs: 13, sm: 14 },
                listStyleType: 'disc',
                listStylePosition: 'outside',
                '& li': {
                  display: 'list-item',
                  pl: 0.5,
                  mb: 0.75,
                  wordBreak: 'break-word',
                },
              }}
            >
              <Box component="li">
                Header labels are flexible (examples): First Name → first_name, Last Name →
                last_name, Name as per ID → name_as_per_id, Email → email, ID Type → id_type,
                ID Number → id_number, Company → company, Department → department, Job Function → jobFunction,
                Country of Residence → countryOfResidence, Years of experience →
                noOfYearOfRelevantWorkExperience, Corporate Account ID → corporateAccountId,
                Learner as an Accounting Professional → learnerAsAnAccounting, Membership Number
                → membershipNumber, Citizenship/Eligibility → eligibility. Close spellings
                (≥80% match) are accepted; weaker matches return an error with a rename
                suggestion.
              </Box>
              <Box component="li">
                Click <strong>Upload CSV</strong> to open the upload popup. Download the template
                there, or upload a messy Excel — AI maps headers (for example First Name → first_name)
                and checks citizenship, ID type, and member/non-member values. Then wait for validation
                (columns, emails, duplicates, citizenship, existing app / Salesforce accounts). Submit
                stays disabled until validation passes. NRIC / ID number is optional.
              </Box>
              <Box component="li">
                Use View uploaded ZIP files for supporting document ZIP uploads.
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gap: 1 }}>
            <CorpBtn variant="blue" fullWidth component={RouterLink} href={paths.corporate.enrolTrack}>
              View enrolment track
            </CorpBtn>
            <CorpBtn variant="ghost" fullWidth component={RouterLink} href={paths.corporate.bulkUploads}>
              View uploaded ZIP files
            </CorpBtn>
          </Box>
        </CorpCard>
      </Box>

      <CorpCard sx={{ mt: { xs: 1.75, md: 2.75 }, overflow: 'hidden' }}>
        <Form methods={quotationMethods} onSubmit={onSubmitQuotation}>
          <Typography
            sx={{
              color: CORP.navy,
              fontWeight: 700,
              fontSize: { xs: 16, sm: 18 },
              mb: 1.25,
              wordBreak: 'break-word',
            }}
          >
            Foreign non-member quotation request
          </Typography>
          <Typography
            sx={{
              color: CORP.muted,
              lineHeight: 1.55,
              mb: 2,
              fontSize: { xs: 13, sm: 14 },
            }}
          >
            If you want to enrol foreign learners who are not ISCA members, submit this form and ISCA
            will contact you with a quotation and enrolment arrangement. Fields marked{' '}
            <Box component="span" sx={{ color: '#d32f2f' }}>
              *
            </Box>{' '}
            are required.
          </Typography>

          <Box sx={{ ...formGridSx, mb: 2 }}>
            <FieldLabel label="Company name" required>
              <Field.Text
                name="companyName"
                size="small"
                placeholder="Company Pte Ltd"
                sx={fieldSx}
              />
            </FieldLabel>
            <FieldLabel label="Contact person" required>
              <Field.Text
                name="contactPerson"
                size="small"
                placeholder="HR contact name"
                sx={fieldSx}
              />
            </FieldLabel>
            <FieldLabel label="Contact email" required>
              <Field.Text
                name="contactEmail"
                type="email"
                size="small"
                placeholder="hr@company.com"
                sx={fieldSx}
              />
            </FieldLabel>
            <FieldLabel label="Estimated number of foreign learners" required>
              <Field.Text
                name="estimatedParticipants"
                size="small"
                type="number"
                placeholder="e.g. 12"
                sx={fieldSx}
                inputProps={{ min: 1, step: 1 }}
              />
            </FieldLabel>
          </Box>

          <CorpBtn variant="blue" fullWidth type="submit" disabled={isQuotationSubmitting}>
            {isQuotationSubmitting ? 'Sending…' : 'Send quotation request to ISCA'}
          </CorpBtn>
        </Form>
      </CorpCard>
    </Box>
  );
}
