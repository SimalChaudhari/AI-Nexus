import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';

import { CORP } from '../corporate-theme';
import { CorpBtn, CorpCard, CorpPageHeader } from '../corporate-ui';

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

function FieldLabel({ label, children, wide }) {
  return (
    <Box sx={{ gridColumn: wide ? '1 / -1' : 'auto', minWidth: 0, width: '100%' }}>
      <Typography
        sx={{
          fontWeight: 700,
          fontSize: { xs: 12.5, sm: 13 },
          color: '#344256',
          mb: 0.75,
          lineHeight: 1.35,
          wordBreak: 'break-word',
        }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  );
}

// ----------------------------------------------------------------------

export function CorporateEnrolView() {
  return (
    <Box sx={{ width: '100%', minWidth: 0, overflowX: 'hidden' }}>
      <CorpPageHeader
        eyebrow="Staff Enrolment"
        title="Enrol learners individually or in bulk"
        subtitle="Staff may self-register using the corporate reference ID. HR admins may also enrol staff through this portal by entering the required learner details."
        titleSx={{ fontSize: { xs: 22, sm: 26, md: 32 } }}
      />

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
            For Singaporean/Permanent Resident learners and ISCA Members only. Foreigners who are not
            ISCA members should not be enrolled through this form.
          </Typography>

          <Box sx={formGridSx}>
            <FieldLabel label="Full name">
              <TextField fullWidth size="small" placeholder="e.g. Joshua Lee" sx={fieldSx} />
            </FieldLabel>
            <FieldLabel label="Work email">
              <TextField fullWidth size="small" placeholder="name@company.com" sx={fieldSx} />
            </FieldLabel>
            <FieldLabel label="Department">
              <TextField fullWidth size="small" placeholder="Finance, Audit, Tax" sx={fieldSx} />
            </FieldLabel>
            <FieldLabel label="Role">
              <TextField fullWidth size="small" placeholder="Audit Associate" sx={fieldSx} />
            </FieldLabel>
            <FieldLabel label="Eligibility">
              <TextField select fullWidth size="small" defaultValue="sg" sx={fieldSx}>
                <MenuItem value="sg" sx={{ whiteSpace: 'normal' }}>
                  Singaporean/Permanent Residents
                </MenuItem>
                <MenuItem value="isca" sx={{ whiteSpace: 'normal' }}>
                  ISCA Members
                </MenuItem>
              </TextField>
            </FieldLabel>
            <FieldLabel label="ID type">
              <TextField select fullWidth size="small" defaultValue="pink" sx={fieldSx}>
                <MenuItem value="pink">Pink NRIC</MenuItem>
                <MenuItem value="blue">Blue NRIC</MenuItem>
                <MenuItem value="na">Not applicable</MenuItem>
              </TextField>
            </FieldLabel>
            <FieldLabel label="NRIC number">
              <TextField
                fullWidth
                size="small"
                placeholder="Required for Singaporean/PR"
                sx={fieldSx}
              />
            </FieldLabel>
            <FieldLabel label="ISCA membership number">
              <TextField
                fullWidth
                size="small"
                placeholder="Required for ISCA Members"
                sx={fieldSx}
              />
            </FieldLabel>
            <FieldLabel
              wide
              label="Is the learner working as an accounting and related profession?"
            >
              <TextField select fullWidth size="small" defaultValue="yes" sx={fieldSx}>
                <MenuItem value="yes">Yes</MenuItem>
                <MenuItem value="no">No</MenuItem>
              </TextField>
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
              control={<Checkbox size="small" />}
              label="I confirm that I am authorised to submit the above information to ISCA for the purposes of learner enrolment, programme administration and participant communications relating to AI Fluency. I declare that the information provided is true, accurate and complete. I acknowledge that if any inaccurate or false information results in ineligible funding or subsidies being applied, ISCA reserves the right to recover the unfunded amount from the company."
              sx={checkboxLabelSx}
            />
          </Box>

          <CorpBtn variant="blue" fullWidth>
            Submit enrolment
          </CorpBtn>
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
            Members.
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
                The file includes only Singaporean/Permanent Resident learners and ISCA Members.
              </Box>
              <Box component="li">
                For Singaporean/Permanent Resident learners, provide the NRIC number and select either
                Pink NRIC or Blue NRIC.
              </Box>
              <Box component="li">For ISCA Members, provide the valid ISCA membership number.</Box>
              <Box component="li">
                Do not include foreigners who are not ISCA members in the bulk upload. Please email
                ISCA separately for a quotation and enrolment arrangement.
              </Box>
            </Box>
          </Box>

          <CorpBtn variant="ghost" fullWidth>
            Download bulk upload template
          </CorpBtn>
        </CorpCard>
      </Box>

      <CorpCard sx={{ mt: { xs: 1.75, md: 2.75 }, overflow: 'hidden' }}>
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
          Use this pathway when the company wants to enrol foreigners who are not ISCA members. There
          is no self-service payment page for this group in the portal.
        </Typography>

        <Box sx={{ ...formGridSx, mb: 2 }}>
          <FieldLabel label="Company name">
            <TextField fullWidth size="small" placeholder="Company Pte Ltd" sx={fieldSx} />
          </FieldLabel>
          <FieldLabel label="Contact person">
            <TextField fullWidth size="small" placeholder="HR contact name" sx={fieldSx} />
          </FieldLabel>
          <FieldLabel label="Contact email">
            <TextField fullWidth size="small" placeholder="hr@company.com" sx={fieldSx} />
          </FieldLabel>
          <FieldLabel label="Estimated number of foreign learners">
            <TextField fullWidth size="small" placeholder="e.g. 12" sx={fieldSx} />
          </FieldLabel>
        </Box>

        <CorpBtn
          variant="blue"
          fullWidth
          component="a"
          href="mailto:hello@ainexus.isca.org.sg?subject=AI%20Fluency%20Foreign%20Learner%20Quotation%20Request"
        >
          Email ISCA for quotation
        </CorpBtn>
      </CorpCard>
    </Box>
  );
}
