import { useCallback, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Grid from '@mui/material/Grid';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import { alpha, useTheme } from '@mui/material/styles';
import { toast } from 'src/components/snackbar';

import { Iconify } from 'src/components/iconify';
import { MembershipFormTextField } from 'src/components/membership-form-textfield';
import { MembershipFormPhoneField } from 'src/components/membership-form-phone-field';
import { MembershipFormCountrySelect } from 'src/components/membership-form-country-select';
import { MembershipFormSectionTitle } from 'src/components/membership-form-section-title';
import {
  checkStudentMembershipUser,
  createStudentMembershipApplication,
  updateStudentMembershipApplication,
  submitStudentMembershipApplication,
  fetchStudentMembershipApplicationDetails,
} from 'src/api/student-membership-application';
import {
  readMembershipSalesforceSession,
  mergeApplicationIdIntoSession,
} from 'src/utils/membership-salesforce-session';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import {
  EMPTY_STUDENT_MEMBERSHIP_FORM,
  STUDENT_ACADEMIC_LEVELS,
  STUDENT_MEMBERSHIP_CITIZENSHIP_OPTIONS,
  STUDENT_MEMBERSHIP_NATIONALITY_OPTIONS,
  STUDENT_MEMBERSHIP_PROGRAMME_OPTIONS,
  STUDENT_MEMBERSHIP_SCAQ_OPTIONS,
  getStudentMembershipCommencementYearOptions,
  getStudentMembershipGraduationYearOptions,
  buildStudentMembershipApiPayload,
  buildStudentMembershipRequestBody,
  mapStudentMembershipDetailsToForm,
  readStudentMembershipFormDraft,
  sanitizeStudentMembershipFormFields,
  clearStudentMembershipApplicationLocalData,
  saveStudentMembershipFormDraft,
  applyStudentMembershipEmailPrefillFromEligibilityFlow,
  isStudentMembershipTabComplete,
  validateStudentMembershipFormBeforeSubmit,
  validateStudentMembershipTab,
} from 'src/utils/student-membership-application-form';
import { MEMBERSHIP_ELIGIBILITY_FLOW_KEY } from 'src/utils/membership-eligibility-sso';
import {
  parseStudentMembershipCreateResult,
  parseStudentMembershipSubmitResult,
  parseStudentMembershipUserCheckResult,
  STUDENT_MEMBERSHIP_PASSWORD_RESET_INSTRUCTIONS,
} from 'src/utils/membership-application-student';
import {
  DEFAULT_MEMBERSHIP_COUNTRY,
  getMembershipFormFooterSx,
  getMembershipFormPaperSx,
  getMembershipFormSubmitButtonSx,
  getMembershipFormTabsSx,
} from 'src/utils/membership-form-ui';

// ----------------------------------------------------------------------

const TABS = [
  { id: 'personal', label: 'Personal', icon: 'solar:user-bold' },
  { id: 'academic', label: 'Academic', icon: 'solar:diploma-verified-bold' },
  { id: 'preferences', label: 'Preferences', icon: 'solar:settings-bold' },
  { id: 'declarations', label: 'Declarations', icon: 'solar:document-text-bold' },
];

function toggleArrayValue(list, value) {
  const current = Array.isArray(list) ? list : [];
  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
}

export function StudentMembershipApplicationForm({ onSubmitted, fullPage = false }) {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [form, setForm] = useState(() => {
    const draft = readStudentMembershipFormDraft();
    return {
      ...EMPTY_STUDENT_MEMBERSHIP_FORM,
      ...sanitizeStudentMembershipFormFields(draft?.form || {}),
    };
  });
  const [applicationId, setApplicationId] = useState(() => {
    const draft = readStudentMembershipFormDraft();
    return String(draft?.applicationId || '').trim();
  });
  const [applicationName, setApplicationName] = useState(() => {
    const draft = readStudentMembershipFormDraft();
    return draft?.applicationName || '';
  });
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userChecking, setUserChecking] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [submitResult, setSubmitResult] = useState(null);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const persistDraft = useCallback(
    (nextForm, nextApplicationId = applicationId, nextApplicationName = applicationName) => {
      saveStudentMembershipFormDraft({
        form: nextForm,
        applicationId: nextApplicationId,
        applicationName: nextApplicationName,
      });
    },
    [applicationId, applicationName]
  );

  useEffect(() => {
    if (form.personalEmail?.trim()) return;

    let flow = null;
    try {
      const raw = sessionStorage.getItem(MEMBERSHIP_ELIGIBILITY_FLOW_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        flow = parsed?.flow || null;
      }
    } catch {
      // ignore
    }

    if (!flow?.studentPersonalEmail?.trim()) return;

    applyStudentMembershipEmailPrefillFromEligibilityFlow(flow);
    const personalEmail = String(flow.studentPersonalEmail).trim();
    setForm((prev) => {
      if (prev.personalEmail?.trim()) return prev;
      const next = { ...prev, personalEmail };
      saveStudentMembershipFormDraft({
        form: next,
        applicationId,
        applicationName,
      });
      return next;
    });
  }, [applicationId, applicationName, form.personalEmail]);

  useEffect(() => {
    const id = String(applicationId || '').trim();
    if (!id) return undefined;

    let cancelled = false;
    const loadExistingApplication = async () => {
      setLoadingDetails(true);
      try {
        const result = await fetchStudentMembershipApplicationDetails(
          buildStudentMembershipRequestBody({ applicationId: id })
        );
        if (cancelled) return;
        const mapped = mapStudentMembershipDetailsToForm(result?.applicationData || {});
        setForm((prev) => {
          const next = { ...prev, ...mapped };
          persistDraft(next, result?.applicationId || id);
          return next;
        });
        const resolvedId = result?.applicationId || id;
        setApplicationId(resolvedId);
        mergeApplicationIdIntoSession(resolvedId);
      } catch (error) {
        if (!cancelled) {
          toast.error(error?.message || 'Failed to load application details.');
        }
      } finally {
        if (!cancelled) setLoadingDetails(false);
      }
    };

    loadExistingApplication();
    return () => {
      cancelled = true;
    };
  }, [applicationId, persistDraft]);

  const performUserCheck = async () => {
    setUserChecking(true);
    try {
      const result = await checkStudentMembershipUser(
        buildStudentMembershipRequestBody({
          email: form.personalEmail,
          mobileNumber: form.mobileNumber ? `+${form.mobileCountryCode}${form.mobileNumber}` : '',
          matriculationNumber: form.matriculationNumber,
        })
      );
      const parsed = parseStudentMembershipUserCheckResult(result);
      if (parsed.userExists) {
        return { ok: false, message: parsed.message };
      }
      return { ok: true, message: parsed.message };
    } catch (error) {
      return { ok: false, message: error?.message || 'User check failed.' };
    } finally {
      setUserChecking(false);
    }
  };

  const isTabAccessible = useCallback(
    (tabIndex) => {
      if (tabIndex <= activeTab) return true;
      for (let index = 0; index < tabIndex; index += 1) {
        if (!isStudentMembershipTabComplete(TABS[index].id, form)) return false;
      }
      return true;
    },
    [activeTab, form]
  );

  const handleTabChange = (_, value) => {
    if (isTabAccessible(value)) {
      setValidationError('');
      setActiveTab(value);
    }
  };

  const handlePreviousTab = () => {
    setValidationError('');
    setActiveTab((prev) => Math.max(0, prev - 1));
  };

  const handleNextTab = async () => {
    const tabId = TABS[activeTab]?.id;
    const error = validateStudentMembershipTab(tabId, form);
    if (error) {
      setValidationError(error);
      return;
    }

    if (tabId === 'personal') {
      const userCheck = await performUserCheck();
      if (!userCheck.ok) {
        setValidationError(userCheck.message);
        return;
      }
    }

    setValidationError('');
    persistDraft(form);
    setActiveTab((prev) => Math.min(TABS.length - 1, prev + 1));
  };

  const submitApplication = async () => {
    const error = validateStudentMembershipFormBeforeSubmit(form);
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError('');
    setSubmitting(true);
    try {
      const applicationData = buildStudentMembershipApiPayload(form);
      let id = String(applicationId || '').trim();
      let resolvedName = applicationName;

      if (!id) {
        const createResult = await createStudentMembershipApplication(
          buildStudentMembershipRequestBody({ applicationData })
        );
        const parsedCreate = parseStudentMembershipCreateResult(createResult);
        id = String(parsedCreate.applicationId || '').trim();
        resolvedName = parsedCreate.applicationName || resolvedName;

        if (!id) {
          throw new Error('Application could not be created. Please try again.');
        }

        setApplicationId(id);
        if (resolvedName) {
          setApplicationName(resolvedName);
        }
        mergeApplicationIdIntoSession(id);
        persistDraft(form, id, resolvedName);
      } else {
        await updateStudentMembershipApplication(
          buildStudentMembershipRequestBody({ applicationData, applicationId: id })
        );
        persistDraft(form, id, resolvedName);
      }

      const result = await submitStudentMembershipApplication(
        buildStudentMembershipRequestBody({ applicationId: id })
      );

      const submitParsed = parseStudentMembershipSubmitResult(result);
      const parsed = {
        ...submitParsed,
        applicationName: submitParsed.applicationName || resolvedName || applicationName,
        applicationId: id,
      };
      setSubmitResult(parsed);
      clearStudentMembershipApplicationLocalData();
      toast.success(parsed.message || 'Student membership application submitted.');
    } catch (error) {
      toast.error(error?.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  const personalFieldSize = 'small';
  const gridCol3 = { xs: 12, sm: 6, md: 4 };
  const formCheckboxLabelSx = {
    m: 0,
    mr: 0,
    alignItems: 'flex-start',
    '& .MuiCheckbox-root': { p: 1, ml: -0.5 },
    '& .MuiFormControlLabel-label': { mt: 1.05, lineHeight: 1.5 },
  };

  const renderPersonalTab = () => (
    <Grid container spacing={2}>
      <MembershipFormSectionTitle title="Personal details" firstSection />
      <Grid item {...gridCol3}>
        <MembershipFormTextField
          label="First name"
          required
          size={personalFieldSize}
          fullWidth
          value={form.firstName}
          onChange={(e) => updateField('firstName', e.target.value)}
        />
      </Grid>
      <Grid item {...gridCol3}>
        <MembershipFormTextField
          label="Last name"
          required
          size={personalFieldSize}
          fullWidth
          value={form.lastName}
          onChange={(e) => updateField('lastName', e.target.value)}
        />
      </Grid>
      <Grid item {...gridCol3}>
        <MembershipFormTextField
          label="Name as per ID"
          required
          size={personalFieldSize}
          fullWidth
          value={form.nameAsPerId}
          onChange={(e) => updateField('nameAsPerId', e.target.value)}
        />
      </Grid>
      <Grid item {...gridCol3}>
        <MembershipFormTextField
          label="Date of birth"
          required
          type="date"
          size={personalFieldSize}
          fullWidth
          InputLabelProps={{ shrink: true }}
          value={form.dateOfBirth}
          onChange={(e) => updateField('dateOfBirth', e.target.value)}
        />
      </Grid>
      <Grid item {...gridCol3}>
        <MembershipFormTextField
          select
          label="Gender"
          size={personalFieldSize}
          fullWidth
          value={form.gender}
          onChange={(e) => updateField('gender', e.target.value)}
        >
          <MenuItem value="Male">Male</MenuItem>
          <MenuItem value="Female">Female</MenuItem>
        </MembershipFormTextField>
      </Grid>
      <Grid item {...gridCol3}>
        <MembershipFormTextField
          select
          label="Nationality"
          size={personalFieldSize}
          fullWidth
          value={form.nationality}
          onChange={(e) => updateField('nationality', e.target.value)}
        >
          {STUDENT_MEMBERSHIP_NATIONALITY_OPTIONS.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </MembershipFormTextField>
      </Grid>
      <Grid item {...gridCol3}>
        <MembershipFormTextField
          select
          label="Citizenship"
          size={personalFieldSize}
          fullWidth
          value={form.citizenship}
          onChange={(e) => updateField('citizenship', e.target.value)}
        >
          {STUDENT_MEMBERSHIP_CITIZENSHIP_OPTIONS.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </MembershipFormTextField>
      </Grid>
      <Grid item {...gridCol3}>
        <MembershipFormTextField
          label="ID type"
          size={personalFieldSize}
          fullWidth
          value={form.idType}
          onChange={(e) => updateField('idType', e.target.value)}
        />
      </Grid>
      <Grid item {...gridCol3}>
        <MembershipFormTextField
          label="Matriculation number"
          required
          size={personalFieldSize}
          fullWidth
          value={form.matriculationNumber}
          onChange={(e) => updateField('matriculationNumber', e.target.value)}
        />
      </Grid>
      <Grid item {...gridCol3}>
        <MembershipFormTextField
          label="Personal email"
          required
          size={personalFieldSize}
          fullWidth
          value={form.personalEmail}
          onChange={(e) => updateField('personalEmail', e.target.value)}
        />
      </Grid>
      <Grid item {...gridCol3}>
        <MembershipFormTextField
          label="Email friendly name"
          size={personalFieldSize}
          fullWidth
          value={form.emailFriendlyName}
          onChange={(e) => updateField('emailFriendlyName', e.target.value)}
        />
      </Grid>
      <Grid item {...gridCol3}>
        <MembershipFormPhoneField
          label="Mobile number"
          required
          size={personalFieldSize}
          countryCode={form.mobileCountryCode}
          number={form.mobileNumber}
          onCountryCodeChange={(e) => updateField('mobileCountryCode', e.target.value)}
          onNumberChange={(e) => updateField('mobileNumber', e.target.value)}
        />
      </Grid>

      <MembershipFormSectionTitle title="Residential address" />
      <Grid item {...gridCol3}>
        <MembershipFormTextField
          label="Address line 1"
          required
          size={personalFieldSize}
          fullWidth
          value={form.addressLine1}
          onChange={(e) => updateField('addressLine1', e.target.value)}
        />
      </Grid>
      <Grid item {...gridCol3}>
        <MembershipFormTextField
          label="Address line 2"
          size={personalFieldSize}
          fullWidth
          value={form.addressLine2}
          onChange={(e) => updateField('addressLine2', e.target.value)}
        />
      </Grid>
      <Grid item {...gridCol3}>
        <MembershipFormTextField
          label="Unit number"
          size={personalFieldSize}
          fullWidth
          value={form.unitNumber}
          onChange={(e) => updateField('unitNumber', e.target.value)}
        />
      </Grid>
      <Grid item {...gridCol3}>
        <MembershipFormTextField
          label="Postal code"
          required
          size={personalFieldSize}
          fullWidth
          value={form.postalCode}
          onChange={(e) => updateField('postalCode', e.target.value)}
        />
      </Grid>
      <Grid item {...gridCol3}>
        <MembershipFormTextField
          label="City"
          size={personalFieldSize}
          fullWidth
          value={form.city}
          onChange={(e) => updateField('city', e.target.value)}
        />
      </Grid>
      <Grid item {...gridCol3}>
        <MembershipFormTextField
          label="State"
          size={personalFieldSize}
          fullWidth
          value={form.state}
          onChange={(e) => updateField('state', e.target.value)}
        />
      </Grid>
      <Grid item {...gridCol3}>
        <MembershipFormCountrySelect
          label="Country"
          size={personalFieldSize}
          value={form.country || DEFAULT_MEMBERSHIP_COUNTRY}
          onChange={(value) => updateField('country', value)}
        />
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Checkbox
              checked={Boolean(form.copyAddress)}
              onChange={(e) => updateField('copyAddress', e.target.checked)}
            />
          }
          label="Mailing address same as residential address"
        />
      </Grid>
    </Grid>
  );

  const commencementYearOptions = getStudentMembershipCommencementYearOptions();
  const graduationYearOptions = getStudentMembershipGraduationYearOptions();

  const renderAcademicTab = () => (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <MembershipFormSectionTitle title="Academic information" />
      </Grid>
      <Grid item {...gridCol3}>
        <MembershipFormTextField
          select
          label="Academic level"
          required
          size={personalFieldSize}
          fullWidth
          value={form.academicLevel}
          onChange={(e) => updateField('academicLevel', e.target.value)}
        >
          {STUDENT_ACADEMIC_LEVELS.map((level) => (
            <MenuItem key={level} value={level}>
              {level}
            </MenuItem>
          ))}
        </MembershipFormTextField>
      </Grid>
      <Grid item {...gridCol3}>
        <MembershipFormTextField
          label="Institution name"
          required
          size={personalFieldSize}
          fullWidth
          value={form.institutionName}
          onChange={(e) => updateField('institutionName', e.target.value)}
        />
      </Grid>
      <Grid item {...gridCol3}>
        <MembershipFormTextField
          label="Qualification"
          required
          size={personalFieldSize}
          fullWidth
          value={form.qualification}
          onChange={(e) => updateField('qualification', e.target.value)}
        />
      </Grid>
      <Grid item {...gridCol3}>
        <MembershipFormTextField
          label="Other qualification"
          size={personalFieldSize}
          fullWidth
          value={form.otherQualification}
          onChange={(e) => updateField('otherQualification', e.target.value)}
        />
      </Grid>
      <Grid item {...gridCol3}>
        <MembershipFormTextField
          select
          label="Course commencement year"
          required
          size={personalFieldSize}
          fullWidth
          value={form.courseCommencementYear}
          onChange={(e) => updateField('courseCommencementYear', e.target.value)}
        >
          <MenuItem value="">
            <em>Select year</em>
          </MenuItem>
          {commencementYearOptions.map((year) => (
            <MenuItem key={year} value={year}>
              {year}
            </MenuItem>
          ))}
        </MembershipFormTextField>
      </Grid>
      <Grid item {...gridCol3}>
        <MembershipFormTextField
          select
          label="Expected graduation year"
          required
          size={personalFieldSize}
          fullWidth
          value={form.expectedGraduationYear}
          onChange={(e) => updateField('expectedGraduationYear', e.target.value)}
        >
          <MenuItem value="">
            <em>Select year</em>
          </MenuItem>
          {graduationYearOptions.map((year) => (
            <MenuItem key={year} value={year}>
              {year}
            </MenuItem>
          ))}
        </MembershipFormTextField>
      </Grid>
      <Grid item {...gridCol3}>
        <MembershipFormTextField
          label="Qualification institution"
          size={personalFieldSize}
          fullWidth
          value={form.qualificationInstitutionName}
          onChange={(e) => updateField('qualificationInstitutionName', e.target.value)}
          helperText="Defaults to institution name if left blank"
        />
      </Grid>
    </Grid>
  );

  const renderPreferencesTab = () => {
    const programmeSelections = Array.isArray(form.studentMembershipProgramme)
      ? form.studentMembershipProgramme
      : [];
    const scaqSelections = Array.isArray(form.studentMembershipSCAQ) ? form.studentMembershipSCAQ : [];

    return (
      <Grid container spacing={2}>
        <MembershipFormSectionTitle title="Preferences" firstSection />

        <Grid item xs={12}>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Student membership programme <Box component="span" sx={{ color: 'error.main' }}>*</Box>
          </Typography>
          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap sx={{ rowGap: 0.5 }}>
            {STUDENT_MEMBERSHIP_PROGRAMME_OPTIONS.map((option) => (
              <FormControlLabel
                key={option}
                control={
                  <Checkbox
                    checked={programmeSelections.includes(option)}
                    onChange={() =>
                      updateField(
                        'studentMembershipProgramme',
                        toggleArrayValue(programmeSelections, option)
                      )
                    }
                  />
                }
                label={option}
              />
            ))}
          </Stack>
        </Grid>

        <Grid item xs={12}>
          <MembershipFormTextField
            label="Other programme details"
            size={personalFieldSize}
            fullWidth
            multiline
            minRows={2}
            value={form.studentMembershipOtherDetail}
            onChange={(e) => updateField('studentMembershipOtherDetail', e.target.value)}
          />
        </Grid>

        <Grid item {...gridCol3}>
          <MembershipFormTextField
            select
            label="Plans to take CA qualification"
            size={personalFieldSize}
            fullWidth
            value={form.plansToTakeCAQualification}
            onChange={(e) => updateField('plansToTakeCAQualification', e.target.value)}
          >
            <MenuItem value="Yes">Yes</MenuItem>
            <MenuItem value="No">No</MenuItem>
            <MenuItem value="Maybe">Maybe</MenuItem>
          </MembershipFormTextField>
        </Grid>

        {form.plansToTakeCAQualification !== 'Yes' && (
          <>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                SCAQ considerations
              </Typography>
              <Stack spacing={0.5}>
                {STUDENT_MEMBERSHIP_SCAQ_OPTIONS.map((option) => (
                  <FormControlLabel
                    key={option}
                    sx={formCheckboxLabelSx}
                    control={
                      <Checkbox
                        checked={scaqSelections.includes(option)}
                        onChange={() =>
                          updateField(
                            'studentMembershipSCAQ',
                            toggleArrayValue(scaqSelections, option)
                          )
                        }
                      />
                    }
                    label={option}
                  />
                ))}
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <MembershipFormTextField
                label="SCAQ other details"
                size={personalFieldSize}
                fullWidth
                multiline
                minRows={2}
                value={form.studentMembershipSCAQOtherDetail}
                onChange={(e) => updateField('studentMembershipSCAQOtherDetail', e.target.value)}
              />
            </Grid>
          </>
        )}

        <Grid item xs={12} sm={4}>
          <MembershipFormTextField
            select
            label="Voice calls"
            size={personalFieldSize}
            fullWidth
            value={form.voiceCalls}
            onChange={(e) => updateField('voiceCalls', e.target.value)}
          >
            <MenuItem value="Yes">Yes</MenuItem>
            <MenuItem value="No">No</MenuItem>
          </MembershipFormTextField>
        </Grid>
        <Grid item xs={12} sm={4}>
          <MembershipFormTextField
            select
            label="Text messages"
            size={personalFieldSize}
            fullWidth
            value={form.textMessages}
            onChange={(e) => updateField('textMessages', e.target.value)}
          >
            <MenuItem value="Yes">Yes</MenuItem>
            <MenuItem value="No">No</MenuItem>
          </MembershipFormTextField>
        </Grid>
        <Grid item xs={12} sm={4}>
          <MembershipFormTextField
            select
            label="Fax messages"
            size={personalFieldSize}
            fullWidth
            value={form.faxMessages}
            onChange={(e) => updateField('faxMessages', e.target.value)}
          >
            <MenuItem value="Yes">Yes</MenuItem>
            <MenuItem value="No">No</MenuItem>
          </MembershipFormTextField>
        </Grid>

        <Grid item xs={12}>
          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap sx={{ rowGap: 0.5 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={Boolean(form.subscribeStudentMembershipEDM)}
                  onChange={(e) => updateField('subscribeStudentMembershipEDM', e.target.checked)}
                />
              }
              label="Subscribe to student membership EDM"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={Boolean(form.subscribeCharteredAccountant)}
                  onChange={(e) => updateField('subscribeCharteredAccountant', e.target.checked)}
                />
              }
              label="Subscribe to Chartered Accountant updates"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={Boolean(form.doNotMarket)}
                  onChange={(e) => updateField('doNotMarket', e.target.checked)}
                />
              }
              label="Do not market to me"
            />
          </Stack>
        </Grid>
      </Grid>
    );
  };

  const renderDeclarationsTab = () => (
    <Grid container spacing={2}>
      <MembershipFormSectionTitle title="Declarations" firstSection />
      <Grid item xs={12}>
        <Stack spacing={0.5}>
          <FormControlLabel
            sx={formCheckboxLabelSx}
            control={
              <Checkbox
                checked={Boolean(form.declaration1)}
                onChange={(e) => updateField('declaration1', e.target.checked)}
              />
            }
            label="I declare that the information provided is true and correct."
          />
          <FormControlLabel
            sx={formCheckboxLabelSx}
            control={
              <Checkbox
                checked={Boolean(form.declaration2)}
                onChange={(e) => updateField('declaration2', e.target.checked)}
              />
            }
            label="I agree to ISCA Student Membership terms and conditions."
          />
          <FormControlLabel
            sx={formCheckboxLabelSx}
            control={
              <Checkbox
                checked={Boolean(form.declaration3)}
                onChange={(e) => updateField('declaration3', e.target.checked)}
              />
            }
            label="I consent to ISCA processing my personal data for membership purposes."
          />
        </Stack>
      </Grid>
      {applicationId && (
        <Grid item xs={12}>
          <Alert severity="info">
            Application ID: <strong>{applicationId}</strong>
          </Alert>
        </Grid>
      )}
    </Grid>
  );

  const tabContent = {
    personal: renderPersonalTab(),
    academic: renderAcademicTab(),
    preferences: renderPreferencesTab(),
    declarations: renderDeclarationsTab(),
  };

  const currentTabId = TABS[activeTab]?.id;
  const isLastTab = activeTab >= TABS.length - 1;
  const isCurrentTabComplete = isStudentMembershipTabComplete(currentTabId, form);

  if (submitResult) {
    const isApproved = submitResult.isApproved;
    return (
      <Box sx={{ width: 1, maxWidth: 720, mx: 'auto' }}>
        <Alert
          severity={isApproved ? 'success' : 'info'}
          icon={<Iconify icon="solar:verified-check-bold" width={24} />}
          sx={{ mb: 2.5 }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
            {submitResult.message}
          </Typography>
          {!!submitResult.status && (
            <Typography variant="body2" color="text.secondary">
              Status: {submitResult.status}
            </Typography>
          )}
        </Alert>

        <Stack
          spacing={1.5}
          sx={(t) => ({
            p: 2.5,
            borderRadius: 2,
            border: `1px solid ${alpha(t.palette.primary.main, 0.14)}`,
            bgcolor: 'background.paper',
          })}
        >
          {!!submitResult.applicationName && (
            <Stack direction="row" justifyContent="space-between" spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Application name
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {submitResult.applicationName}
              </Typography>
            </Stack>
          )}
          {!!submitResult.applicationStatus && (
            <Stack direction="row" justifyContent="space-between" spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Application status
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {submitResult.applicationStatus}
              </Typography>
            </Stack>
          )}
          {!!submitResult.applicationId && (
            <Stack direction="row" justifyContent="space-between" spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Application ID
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                {submitResult.applicationId}
              </Typography>
            </Stack>
          )}
        </Stack>

        <Stack spacing={2} sx={{ mt: 2.5 }}>
          {isApproved && (
            <Alert severity="info" icon={<Iconify icon="solar:letter-bold" width={22} />}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Check your email
              </Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.65 }}>
                {STUDENT_MEMBERSHIP_PASSWORD_RESET_INSTRUCTIONS}
              </Typography>
            </Alert>
          )}

          <Alert severity={isApproved ? 'success' : 'info'} variant="outlined">
            <Typography variant="body2" sx={{ lineHeight: 1.65 }}>
              {isApproved
                ? 'After you set your eServices password, use the Sign in button below to access AI Nexus.'
                : 'Your application has been submitted. Once ISCA confirms your student membership, use the Sign in button below.'}
            </Typography>
          </Alert>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3 }}>
          <Button
            component={RouterLink}
            href={paths.auth.simple.signIn}
            variant="contained"
            size="large"
            startIcon={<Iconify icon="solar:login-3-bold" width={20} />}
            sx={getMembershipFormSubmitButtonSx(theme)}
          >
            Sign in
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: 1,
        ...(fullPage ? { flex: 1, display: 'flex', flexDirection: 'column' } : {}),
      }}
    >
      <Box sx={getMembershipFormPaperSx(theme)}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={getMembershipFormTabsSx(theme, fullPage)}
        >
          {TABS.map((tab) => (
            <Tab
              key={tab.id}
              icon={<Iconify icon={tab.icon} width={18} />}
              iconPosition="start"
              label={tab.label}
            />
          ))}
        </Tabs>

        <Box sx={{ p: { xs: 2, md: 3 } }}>
          {loadingDetails && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Loading existing application details…
            </Alert>
          )}
          {validationError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setValidationError('')}>
              {validationError}
            </Alert>
          )}
          {!!applicationId && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Application saved
              {applicationName ? ` · ${applicationName}` : ''}
              {applicationId ? ` · ID ${applicationId}` : ''}
              . Use <strong>Submit application</strong> to send the final request to ISCA.
            </Alert>
          )}
          {tabContent[TABS[activeTab]?.id]}
        </Box>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
          sx={getMembershipFormFooterSx(theme, fullPage)}
        >
          {activeTab > 0 ? (
            <Button
              variant="outlined"
              onClick={handlePreviousTab}
              startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
              sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
            >
              Previous
            </Button>
          ) : (
            <Box sx={{ display: { xs: 'none', sm: 'block' } }} />
          )}

          {isLastTab ? (
            <LoadingButton
              variant="contained"
              loading={submitting}
              disabled={!isCurrentTabComplete}
              onClick={submitApplication}
              sx={{ ...getMembershipFormSubmitButtonSx(theme), ml: { sm: 'auto' } }}
            >
              Submit application
            </LoadingButton>
          ) : (
            <LoadingButton
              variant="contained"
              loading={userChecking}
              disabled={!isCurrentTabComplete || userChecking}
              onClick={handleNextTab}
              endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}
              sx={{ ...getMembershipFormSubmitButtonSx(theme), ml: { sm: 'auto' } }}
            >
              Next
            </LoadingButton>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
