import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import LoadingButton from '@mui/lab/LoadingButton';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TableContainer from '@mui/material/TableContainer';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { MembershipFormCountrySelect } from 'src/components/membership-form-country-select';
import {
  DEFAULT_MEMBERSHIP_COUNTRY,
  getMembershipFormSubmitButtonSx,
  getMembershipQualificationTableSx,
} from 'src/utils/membership-form-ui';
import { RequiredMark } from 'src/utils/membership-form-required-mark';
import {
  EMPTY_ACADEMIC_ENTRY,
  EMPTY_PROFESSIONAL_ENTRY,
  EMPTY_ATO_ENTRY,
  EMPTY_OPB_ENTRY,
  QUALIFICATION_SUBMIT_KEYS,
} from 'src/utils/membership-application-qualification';
import { isExperiencedMembershipApplicationPathway } from 'src/utils/membership-application-pathway';

// ----------------------------------------------------------------------

const fieldSize = 'small';

function EmptyTableRow({ colSpan }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} align="center" sx={{ py: 3, color: 'text.secondary' }}>
        No data available — click + New to add a row
      </TableCell>
    </TableRow>
  );
}

function SectionSubmitBar({
  label,
  loading,
  submittedAt,
  onSubmit,
  optionalHint,
  theme,
}) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      justifyContent="flex-end"
      spacing={1.5}
      sx={{
        px: 2,
        py: 2,
        borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        bgcolor: alpha(theme.palette.primary.main, 0.02),
      }}
    >
      {optionalHint && (
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1, alignSelf: 'center' }}>
          {optionalHint}
        </Typography>
      )}
      {submittedAt && (
        <Typography variant="caption" color="success.main" sx={{ fontWeight: 600, alignSelf: 'center' }}>
          Submitted
        </Typography>
      )}
      <LoadingButton
        variant="contained"
        color="primary"
        loading={loading}
        onClick={onSubmit}
        sx={getMembershipFormSubmitButtonSx(theme)}
      >
        {label}
      </LoadingButton>
    </Stack>
  );
}

function SectionHeader({ title, required, onAdd, secondaryColor, primaryColor }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.25 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: secondaryColor }}>
          {title}
          {required && (
            <Box component="span" sx={{ color: 'primary.main', ml: 0.5 }}>
              *
            </Box>
          )}
          {!required && (
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              (optional)
            </Typography>
          )}
        </Typography>
        <Button
        variant="contained"
        color="success"
        size="small"
        startIcon={<Iconify icon="mingcute:add-line" width={18} />}
        onClick={onAdd}
        sx={{ textTransform: 'none', fontWeight: 700, boxShadow: 'none' }}
      >
        New
      </Button>
      </Stack>
      <Divider
        sx={{
          border: 'none',
          height: 2,
          borderRadius: 1,
          background: `linear-gradient(90deg, ${primaryColor} 0%, ${alpha(secondaryColor, 0.45)} 100%)`,
        }}
      />
    </Box>
  );
}

// ----------------------------------------------------------------------

export function MembershipApplicationQualificationSection({
  qualification,
  applicationId,
  pathway,
  submittedTabs = {},
  submittingSection = '',
  onUpdateAcademic,
  onUpdateProfessional,
  onUpdateAto,
  onUpdateOpb,
  onAddAcademic,
  onAddProfessional,
  onAddAto,
  onAddOpb,
  onRemoveAcademic,
  onRemoveProfessional,
  onRemoveAto,
  onRemoveOpb,
  onSubmitAcademic,
  onSubmitProfessional,
  onSubmitAto,
  onSubmitOpb,
}) {
  const theme = useTheme();
  const { primary, secondary } = theme.palette;
  const isExperienced = isExperiencedMembershipApplicationPathway(pathway);
  const academic = qualification.academic || [];
  const professional = qualification.professional || [];
  const ato = qualification.ato || [];
  const opb = qualification.opb || [];

  const tablePaperSx = getMembershipQualificationTableSx(theme);

  return (
    <Stack spacing={1}>
      <Alert severity="info" sx={{ py: 0.5 }}>
        Application ID: {applicationId || '— submit Application tab first'}
      </Alert>

      <Box sx={tablePaperSx}>
        <Box sx={{ px: 2, pt: 2 }}>
          <SectionHeader
            title="Academic Qualification"
            required={isExperienced}
            onAdd={onAddAcademic}
            secondaryColor={secondary.main}
            primaryColor={primary.main}
          />
        </Box>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.grey[500], 0.08) }}>
                <TableCell width={48}>No.</TableCell>
                <TableCell sx={{ minWidth: 120 }}>Country</TableCell>
                <TableCell sx={{ minWidth: 180 }}>
                  Institution Name
                  <RequiredMark />
                </TableCell>
                <TableCell sx={{ minWidth: 140 }}>Other Institution</TableCell>
                <TableCell sx={{ minWidth: 160 }}>
                  Academic Qualification
                  <RequiredMark />
                </TableCell>
                <TableCell sx={{ minWidth: 140 }}>Other Qualification</TableCell>
                <TableCell sx={{ minWidth: 150 }}>
                  Course Commencement
                  <RequiredMark />
                </TableCell>
                <TableCell sx={{ minWidth: 130 }}>
                  Graduation Date
                  <RequiredMark />
                </TableCell>
                <TableCell width={72} align="center">
                  Action
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {academic.length === 0 ? (
                <EmptyTableRow colSpan={9} />
              ) : (
                academic.map((row, index) => (
                  <TableRow key={`academic-${index}`}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell sx={{ minWidth: 200 }}>
                      <MembershipFormCountrySelect
                        hideLabel
                        disabled
                        value={row.country || DEFAULT_MEMBERSHIP_COUNTRY}
                        onChange={(e) => onUpdateAcademic(index, 'country', e.target.value)}
                        placeholder={DEFAULT_MEMBERSHIP_COUNTRY}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size={fieldSize}
                        fullWidth
                        required
                        value={row.institutionName ?? ''}
                        onChange={(e) =>
                          onUpdateAcademic(index, 'institutionName', e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size={fieldSize}
                        fullWidth
                        value={row.otherInstitutionName ?? ''}
                        onChange={(e) =>
                          onUpdateAcademic(index, 'otherInstitutionName', e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size={fieldSize}
                        fullWidth
                        required
                        value={row.academicQualification ?? ''}
                        onChange={(e) =>
                          onUpdateAcademic(index, 'academicQualification', e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size={fieldSize}
                        fullWidth
                        value={row.otherAcademicQualification ?? ''}
                        onChange={(e) =>
                          onUpdateAcademic(index, 'otherAcademicQualification', e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size={fieldSize}
                        type="date"
                        fullWidth
                        required
                        InputLabelProps={{ shrink: true }}
                        value={row.dateOfCourseCommencement ?? ''}
                        onChange={(e) =>
                          onUpdateAcademic(index, 'dateOfCourseCommencement', e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size={fieldSize}
                        type="date"
                        fullWidth
                        required
                        InputLabelProps={{ shrink: true }}
                        value={row.dateOfGraduation ?? ''}
                        onChange={(e) =>
                          onUpdateAcademic(index, 'dateOfGraduation', e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onRemoveAcademic(index)}
                        aria-label="Remove"
                      >
                        <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <SectionSubmitBar
          theme={theme}
          label="Submit"
          loading={submittingSection === QUALIFICATION_SUBMIT_KEYS.academic}
          submittedAt={submittedTabs[QUALIFICATION_SUBMIT_KEYS.academic]}
          optionalHint="Optional — leave empty and submit to skip, or add rows then submit."
          onSubmit={onSubmitAcademic}
        />
      </Box>

      <Box sx={tablePaperSx}>
        <Box sx={{ px: 2, pt: 2 }}>
          <SectionHeader
            title="Professional Qualification"
            required
            onAdd={onAddProfessional}
            secondaryColor={secondary.main}
            primaryColor={primary.main}
          />
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.grey[500], 0.08) }}>
                <TableCell width={48}>No.</TableCell>
                <TableCell>
                  Name of Professional Body/Qualification
                  <RequiredMark />
                </TableCell>
                <TableCell>
                  Date of Course Commencement
                  <RequiredMark />
                </TableCell>
                <TableCell>
                  Expected / Completion Date
                  <RequiredMark />
                </TableCell>
                <TableCell width={72} align="center">
                  Action
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {professional.length === 0 ? (
                <EmptyTableRow colSpan={5} />
              ) : (
                professional.map((row, index) => (
                  <TableRow key={`prof-${index}`}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <TextField
                        size={fieldSize}
                        fullWidth
                        required
                        value={row.institutionName}
                        onChange={(e) =>
                          onUpdateProfessional(index, 'institutionName', e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size={fieldSize}
                        type="date"
                        fullWidth
                        required
                        InputLabelProps={{ shrink: true }}
                        value={row.dateOfCourseCommencement}
                        onChange={(e) =>
                          onUpdateProfessional(index, 'dateOfCourseCommencement', e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size={fieldSize}
                        type="date"
                        fullWidth
                        required
                        InputLabelProps={{ shrink: true }}
                        value={row.dateOfGraduation}
                        onChange={(e) =>
                          onUpdateProfessional(index, 'dateOfGraduation', e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onRemoveProfessional(index)}
                        disabled={professional.length <= 1}
                        aria-label="Remove"
                      >
                        <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <SectionSubmitBar
          theme={theme}
          label="Submit"
          loading={submittingSection === QUALIFICATION_SUBMIT_KEYS.professional}
          submittedAt={submittedTabs[QUALIFICATION_SUBMIT_KEYS.professional]}
          onSubmit={onSubmitProfessional}
        />
      </Box>

      {isExperienced ? (
        <Box sx={tablePaperSx}>
          <Box sx={{ px: 2, pt: 2 }}>
            <SectionHeader
              title="Membership of Other Professional Bodies"
              required
              onAdd={onAddOpb}
              secondaryColor={secondary.main}
              primaryColor={primary.main}
            />
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.grey[500], 0.08) }}>
                  <TableCell width={48}>No.</TableCell>
                  <TableCell>
                    Institution name
                    <RequiredMark />
                  </TableCell>
                  <TableCell>
                    Membership status
                    <RequiredMark />
                  </TableCell>
                  <TableCell>
                    Membership ID
                    <RequiredMark />
                  </TableCell>
                  <TableCell width={72} align="center">
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {opb.length === 0 ? (
                  <EmptyTableRow colSpan={5} />
                ) : (
                  opb.map((row, index) => (
                    <TableRow key={`opb-${index}`}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <TextField
                          size={fieldSize}
                          fullWidth
                          required
                          value={row.institutionName}
                          onChange={(e) =>
                            onUpdateOpb(index, 'institutionName', e.target.value)
                          }
                          placeholder="Chartered Institute of Management Accountants (CIMA)"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size={fieldSize}
                          fullWidth
                          required
                          value={row.membershipStatus}
                          onChange={(e) =>
                            onUpdateOpb(index, 'membershipStatus', e.target.value)
                          }
                          placeholder="Fellow"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size={fieldSize}
                          fullWidth
                          required
                          value={row.membershipId}
                          onChange={(e) => onUpdateOpb(index, 'membershipId', e.target.value)}
                          placeholder="CIMA12345"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => onRemoveOpb(index)}
                          disabled={opb.length <= 1}
                          aria-label="Remove"
                        >
                          <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <SectionSubmitBar
            theme={theme}
            label="Submit"
            loading={submittingSection === QUALIFICATION_SUBMIT_KEYS.opb}
            submittedAt={submittedTabs[QUALIFICATION_SUBMIT_KEYS.opb]}
            onSubmit={onSubmitOpb}
          />
        </Box>
      ) : (
        <>
          <Box sx={tablePaperSx}>
            <Box sx={{ px: 2, pt: 2 }}>
              <SectionHeader
                title="Approved Training Organisation (ATO)"
                required
                onAdd={onAddAto}
                secondaryColor={secondary.main}
                primaryColor={primary.main}
              />
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha(theme.palette.grey[500], 0.08) }}>
                    <TableCell width={48}>No.</TableCell>
                    <TableCell>
                      ATO Name
                      <RequiredMark />
                    </TableCell>
                    <TableCell>Membership Status</TableCell>
                    <TableCell>Date of Admission as Full Member</TableCell>
                    <TableCell>Membership No.</TableCell>
                    <TableCell width={72} align="center">
                      Action
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ato.length === 0 ? (
                    <EmptyTableRow colSpan={6} />
                  ) : (
                    ato.map((row, index) => (
                      <TableRow key={`ato-${index}`}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <TextField
                            size={fieldSize}
                            fullWidth
                            required
                            value={row.atoName}
                            onChange={(e) => onUpdateAto(index, 'atoName', e.target.value)}
                            placeholder="e.g. K LINE PTE LTD"
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size={fieldSize}
                            fullWidth
                            value={row.membershipStatus}
                            onChange={(e) =>
                              onUpdateAto(index, 'membershipStatus', e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size={fieldSize}
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={row.dateOfAdmissionAsFullMember}
                            onChange={(e) =>
                              onUpdateAto(index, 'dateOfAdmissionAsFullMember', e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size={fieldSize}
                            fullWidth
                            value={row.membershipNo}
                            onChange={(e) => onUpdateAto(index, 'membershipNo', e.target.value)}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => onRemoveAto(index)}
                            disabled={ato.length <= 1}
                            aria-label="Remove"
                          >
                            <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <SectionSubmitBar
              theme={theme}
              label="Submit"
              loading={submittingSection === QUALIFICATION_SUBMIT_KEYS.ato}
              submittedAt={submittedTabs[QUALIFICATION_SUBMIT_KEYS.ato]}
              onSubmit={onSubmitAto}
            />
          </Box>

          <Box sx={tablePaperSx}>
            <Box sx={{ px: 2, pt: 2 }}>
              <SectionHeader
                title="Membership of Other Professional Bodies"
                required
                onAdd={onAddOpb}
                secondaryColor={secondary.main}
                primaryColor={primary.main}
              />
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha(theme.palette.grey[500], 0.08) }}>
                    <TableCell width={48}>No.</TableCell>
                    <TableCell>
                      Institution name
                      <RequiredMark />
                    </TableCell>
                    <TableCell>
                      Membership status
                      <RequiredMark />
                    </TableCell>
                    <TableCell>
                      Membership ID
                      <RequiredMark />
                    </TableCell>
                    <TableCell width={72} align="center">
                      Action
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {opb.length === 0 ? (
                    <EmptyTableRow colSpan={5} />
                  ) : (
                    opb.map((row, index) => (
                      <TableRow key={`opb-${index}`}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <TextField
                            size={fieldSize}
                            fullWidth
                            required
                            value={row.institutionName}
                            onChange={(e) =>
                              onUpdateOpb(index, 'institutionName', e.target.value)
                            }
                            placeholder="Chartered Institute of Management Accountants (CIMA)"
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size={fieldSize}
                            fullWidth
                            required
                            value={row.membershipStatus}
                            onChange={(e) =>
                              onUpdateOpb(index, 'membershipStatus', e.target.value)
                            }
                            placeholder="Fellow"
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size={fieldSize}
                            fullWidth
                            required
                            value={row.membershipId}
                            onChange={(e) => onUpdateOpb(index, 'membershipId', e.target.value)}
                            placeholder="CIMA12345"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => onRemoveOpb(index)}
                            disabled={opb.length <= 1}
                            aria-label="Remove"
                          >
                            <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <SectionSubmitBar
              theme={theme}
              label="Submit"
              loading={submittingSection === QUALIFICATION_SUBMIT_KEYS.opb}
              submittedAt={submittedTabs[QUALIFICATION_SUBMIT_KEYS.opb]}
              onSubmit={onSubmitOpb}
            />
          </Box>
        </>
      )}
    </Stack>
  );
}
