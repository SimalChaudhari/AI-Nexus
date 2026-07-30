import { useRef, useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import LinearProgress from '@mui/material/LinearProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { useRouter } from 'src/routes/hooks';

import { Form, Field } from 'src/components/hook-form';
import { toast } from 'src/components/snackbar';
import { useAuthContext } from 'src/auth/hooks';
import {
  downloadCorporateStaffCsvTemplate,
  enrolCorporateStaff,
  enrolCorporateStaffBulkCsv,
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

  const company = String(form.company || '').trim();
  if (company) payload.company = company;

  const department = String(form.department || '').trim();
  if (department) payload.department = department;

  const staffRole = String(form.staffRole || '').trim();
  if (staffRole) payload.staff_role = staffRole;

  const yearsRaw = String(form.yearsOfExperience || '').trim();
  if (yearsRaw !== '') {
    const years = Number(yearsRaw);
    if (!Number.isNaN(years)) payload.noOfYearOfRelevantWorkExperience = years;
  }

  const corporateAccountId = String(form.corporateAccountId || '').trim();
  if (corporateAccountId) payload.corporateAccountId = corporateAccountId;

  const learnerAsAnAccounting = String(form.learnerAsAnAccounting || '').trim();
  if (learnerAsAnAccounting) payload.learnerAsAnAccounting = learnerAsAnAccounting;

  const eligibility = String(form.eligibility || '').trim();
  if (eligibility) payload.eligibility = eligibility;

  payload.isAuthorisedSubmit = true;

  return payload;
}

function formatApiErrorMessage(err, fallback) {
  const raw = err?.response?.data?.message ?? err?.message ?? fallback;
  const text = Array.isArray(raw) ? raw.filter(Boolean).join(', ') : String(raw || fallback);
  const trimmed = text.trim() || fallback;
  if (trimmed.length <= 140) return trimmed;
  return `${trimmed.slice(0, 137)}…`;
}

/** Short toast only — row-level reasons belong on Enrol Track. */
function showEnrolResultToast(result, fallbackSuccessMessage) {
  const summary = result?.summary || {};
  const skippedList = Array.isArray(result?.skipped) ? result.skipped : [];
  const passed = Number(summary.finalPassed ?? 0);
  const skipped = Number(
    summary.finalSkipped ?? (skippedList.length > 0 ? skippedList.length : 0),
  );
  const total = Number(summary.totalReceived ?? passed + skipped);
  const trackHint = result?.batchId ? ' See Enrol Track for details.' : '';

  if (passed <= 0 && (result?.success === false || skipped > 0)) {
    toast.warning(
      skipped > 0
        ? `No learners enrolled. ${skipped}${total ? ` of ${total}` : ''} row(s) skipped.${trackHint}`
        : result?.message || 'No staff learners were enrolled.',
    );
    return;
  }

  if (skipped > 0) {
    toast.warning(
      `${passed} enrolled, ${skipped} skipped${total ? ` of ${total}` : ''}.${trackHint}`,
    );
    return;
  }

  toast.success(result?.message || fallbackSuccessMessage);
}

const CSV_PROGRESS_STEPS = [
  { label: 'Reading CSV…', value: 18 },
  { label: 'Checking emails in app & Salesforce…', value: 42 },
  { label: 'Creating learners in Salesforce (batches of 100)…', value: 72 },
  { label: 'Saving local users & track records…', value: 90 },
];

// ----------------------------------------------------------------------

export function CorporateEnrolView() {
  const router = useRouter();
  const companyCode = useCorporateCompanyCode();
  const { user } = useAuthContext();
  const csvInputRef = useRef(null);

  const [authorised, setAuthorised] = useState(false);
  const [csvSubmitting, setCsvSubmitting] = useState(false);
  const [csvProgress, setCsvProgress] = useState({ active: false, label: '', value: 0 });
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

  const handleCsvSelected = async (event) => {
    const file = event.target.files?.[0] || null;
    event.target.value = '';
    if (!file) return;
    if (!/\.csv$/i.test(file.name || '')) {
      toast.error('Only .csv files are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('CSV file must be 5MB or smaller');
      return;
    }

    setCsvSubmitting(true);
    setCsvProgress({ active: true, label: CSV_PROGRESS_STEPS[0].label, value: CSV_PROGRESS_STEPS[0].value });
    let stepIndex = 0;
    const progressTimer = window.setInterval(() => {
      stepIndex = Math.min(stepIndex + 1, CSV_PROGRESS_STEPS.length - 1);
      const step = CSV_PROGRESS_STEPS[stepIndex];
      setCsvProgress({ active: true, label: step.label, value: step.value });
    }, 2200);

    try {
      const result = await enrolCorporateStaffBulkCsv(file, companyCode || undefined);
      setCsvProgress({ active: true, label: 'Finishing…', value: 100 });
      setLastEnrolResult(result || null);
      showEnrolResultToast(result, 'Bulk staff enrolment submitted successfully');
      if (result?.batchId) {
        window.setTimeout(() => {
          router.push(paths.corporate.enrolTrackBatch(result.batchId));
        }, 700);
      }
    } catch (err) {
      toast.error(formatApiErrorMessage(err, 'Failed to enrol staff from CSV'));
    } finally {
      window.clearInterval(progressTimer);
      setCsvSubmitting(false);
      window.setTimeout(() => {
        setCsvProgress({ active: false, label: '', value: 0 });
      }, 400);
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
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={handleCsvSelected}
      />

      <CorpPageHeader
        eyebrow="Staff Enrolment"
        title="Enrol learners individually or in bulk"
        subtitle="Fee-waiver enrolment for Singaporean/PR learners and ISCA Members. Staff are created in Salesforce and receive a welcome email from Salesforce to set up login."
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
              variant="ghost"
              onClick={downloadCorporateStaffCsvTemplate}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              Download CSV template
            </CorpBtn>
            <CorpBtn
              variant="blue"
              onClick={() => csvInputRef.current?.click()}
              disabled={csvSubmitting}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              {csvSubmitting ? 'Uploading…' : 'Upload CSV'}
            </CorpBtn>
          </>
        }
      />

      {csvProgress.active ? (
        <CorpCard sx={{ mb: { xs: 1.75, md: 2.25 }, overflow: 'hidden' }}>
          <Typography sx={{ color: CORP.navy, fontWeight: 700, mb: 1, fontSize: { xs: 14, sm: 15 } }}>
            Upload in progress
          </Typography>
          <Typography sx={{ color: CORP.muted, mb: 1.25, fontSize: 13 }}>
            {csvProgress.label}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={csvProgress.value}
            sx={{
              height: 10,
              borderRadius: 999,
              bgcolor: '#e8eef6',
              '& .MuiLinearProgress-bar': { bgcolor: CORP.blue, borderRadius: 999 },
            }}
          />
          <Typography sx={{ color: CORP.muted, mt: 1, fontSize: 12 }}>
            {csvProgress.value}% · Please keep this page open until enrolment finishes.
          </Typography>
        </CorpCard>
      ) : null}

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
              For Singaporean/Permanent Resident learners and ISCA Members only. All
              createblukuserfornexus fields are collected below (company and corporate account ID
              are pre-filled from your login when available). Fields marked{' '}
              <Box component="span" sx={{ color: '#d32f2f' }}>
                *
              </Box>{' '}
              are required.
            </Typography>

            <Box sx={formGridSx}>
              <FieldLabel label="Salutation" required>
                <Field.Select name="salutation" size="small" sx={fieldSx}>
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
              <FieldLabel label="Company" required>
                <Field.Text
                  name="company"
                  size="small"
                  placeholder="e.g. Maybank"
                  sx={fieldSx}
                />
              </FieldLabel>
              <FieldLabel label="Department" required>
                <Field.Text
                  name="department"
                  size="small"
                  placeholder="e.g. Banking Operations"
                  sx={fieldSx}
                />
              </FieldLabel>
              <FieldLabel label="Staff role" required>
                <Field.Text
                  name="staffRole"
                  size="small"
                  placeholder="e.g. Branch Manager"
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
                  sx={fieldSx}
                />
              </FieldLabel>
              <FieldLabel label="Eligibility" required>
                <Field.Select name="eligibility" size="small" sx={fieldSx}>
                  <MenuItem value="Singapore Citizen">Singapore Citizen</MenuItem>
                  <MenuItem value="Singapore PR">Singapore PR</MenuItem>
                  <MenuItem value="ISCA Member">ISCA Member</MenuItem>
                </Field.Select>
              </FieldLabel>
              <FieldLabel
                wide
                required
                label="Is the learner working as an accounting and related profession?"
              >
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
            Bulk enrolment is available only for Singaporean/Permanent Resident learners and ISCA
            Members. Use Upload CSV for createblukuserfornexus fields.
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
              Foreign non-member rule
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
              Foreigners who are not ISCA members cannot be enrolled through the single or bulk
              enrolment flow. Send your request to{' '}
              <Link
                href="mailto:hello@ainexus.isca.org.sg"
                sx={{ color: CORP.blue, wordBreak: 'break-all' }}
              >
                hello@ainexus.isca.org.sg
              </Link>{' '}
              for a separate quotation and enrolment arrangement.
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
                CSV columns match Salesforce createblukuserfornexus (see template) — include
                company, department, staff_role, corporateAccountId and eligibility.
              </Box>
              <Box component="li">
                Company and corporateAccountId are pre-filled from your login when available; you
                can edit them before submit.
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
