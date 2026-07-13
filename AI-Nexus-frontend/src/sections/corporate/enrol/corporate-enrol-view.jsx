import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';

import { CORP } from '../corporate-theme';
import { useCorporateOverview } from '../use-corporate-data';
import { CorpBtn, CorpCard, CorpPageHeader } from '../corporate-ui';

// ----------------------------------------------------------------------

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '14px',
    bgcolor: 'white',
    mt: 0.75,
    '& fieldset': { borderColor: CORP.line },
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

function FieldLabel({ label, children, wide }) {
  return (
    <Box sx={{ gridColumn: wide ? '1 / -1' : 'auto' }}>
      <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#344256', mb: 0.75 }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

// ----------------------------------------------------------------------

export function CorporateEnrolView() {
  const { data } = useCorporateOverview();
  const companyCode = data?.companyCode || '—';

  return (
    <Box>
      <CorpPageHeader
        title="Enrol Staff"
        subtitle={`Enrol learners individually or in bulk. Company code: ${companyCode}`}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,1.55fr) minmax(320px,.75fr)' },
          gap: 2.25,
          alignItems: 'start',
        }}
      >
        <CorpCard>
          <Typography sx={{ color: CORP.navy, fontWeight: 700, fontSize: 18, mb: 1.25 }}>
            Single learner enrolment
          </Typography>
          <Typography sx={{ color: CORP.muted, lineHeight: 1.55, mb: 2 }}>
            For Singaporean/Permanent Resident learners and ISCA Members only. Foreigners who are not
            ISCA members should not be enrolled through this form.
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,minmax(0,1fr))' },
              gap: 1.75,
            }}
          >
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
                <MenuItem value="sg">Singaporean/Permanent Residents</MenuItem>
                <MenuItem value="isca">ISCA Members</MenuItem>
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
              <TextField fullWidth size="small" placeholder="Required for Singaporean/PR" sx={fieldSx} />
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
              display: 'grid',
              gap: 1.5,
              my: 2.25,
              p: 2,
              borderRadius: '18px',
              bgcolor: '#f8fbff',
              border: `1px solid ${CORP.line}`,
              fontSize: 13,
              lineHeight: 1.45,
            }}
          >
            <FormControlLabel
              control={<Checkbox size="small" />}
              label="I confirm that I am authorised to submit the above information to ISCA for the purposes of learner enrolment, programme administration and participant communications relating to AI Fluency."
              sx={{ alignItems: 'flex-start', m: 0, '& .MuiFormControlLabel-label': { fontSize: 13 } }}
            />
            <FormControlLabel
              control={<Checkbox size="small" />}
              label="I declare that the information provided is true, accurate and complete. I acknowledge that if any inaccurate or false information results in ineligible funding or subsidies being applied, ISCA reserves the right to recover the unfunded amount from the company."
              sx={{ alignItems: 'flex-start', m: 0, '& .MuiFormControlLabel-label': { fontSize: 13 } }}
            />
          </Box>

          <CorpBtn variant="blue" fullWidth>
            Submit enrolment
          </CorpBtn>
        </CorpCard>

        <CorpCard>
          <Typography sx={{ color: CORP.navy, fontWeight: 700, fontSize: 18, mb: 1.25 }}>
            Bulk enrolment guidance
          </Typography>
          <Typography sx={{ color: CORP.muted, lineHeight: 1.55, mb: 2 }}>
            Bulk enrolment is available only for Singaporean/Permanent Resident learners and ISCA
            Members.
          </Typography>

          <Box
            sx={{
              bgcolor: '#fff7ed',
              border: '1px solid #fed7aa',
              borderRadius: '18px',
              p: 2,
              mb: 2.25,
            }}
          >
            <Typography sx={{ fontWeight: 700, color: CORP.navy }}>Foreign non-member rule</Typography>
            <Typography sx={{ m: '8px 0 0', lineHeight: 1.5, fontSize: 14, color: CORP.ink }}>
              Foreigners who are not ISCA members cannot be enrolled through the single or bulk
              enrolment flow. Send your request to{' '}
              <Link href="mailto:hello@ainexus.isca.org.sg" sx={{ color: CORP.blue }}>
                hello@ainexus.isca.org.sg
              </Link>{' '}
              for a separate quotation and enrolment arrangement.
            </Typography>
          </Box>

          <Box sx={{ color: CORP.muted, mb: 2 }}>
            <Typography sx={{ mb: 1, color: CORP.ink, fontWeight: 700 }}>
              Before uploading a bulk enrolment file, please ensure that:
            </Typography>
            <Box component="ul" sx={{ pl: 2.5, lineHeight: 1.8, m: 0 }}>
              <li>The file includes only Singaporean/Permanent Resident learners and ISCA Members.</li>
              <li>
                For Singaporean/Permanent Resident learners, provide the NRIC number and select either
                Pink NRIC or Blue NRIC.
              </li>
              <li>For ISCA Members, provide the valid ISCA membership number.</li>
              <li>
                Do not include foreigners who are not ISCA members in the bulk upload. Please email
                ISCA separately for a quotation and enrolment arrangement.
              </li>
            </Box>
          </Box>

          <CorpBtn variant="ghost" fullWidth>
            Download bulk upload template
          </CorpBtn>
        </CorpCard>
      </Box>

      <CorpCard sx={{ mt: 2.75 }}>
        <Typography sx={{ color: CORP.navy, fontWeight: 700, fontSize: 18, mb: 1.25 }}>
          Foreign non-member quotation request
        </Typography>
        <Typography sx={{ color: CORP.muted, lineHeight: 1.55, mb: 2 }}>
          Use this pathway when the company wants to enrol foreigners who are not ISCA members. There
          is no self-service payment page for this group in the portal.
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,minmax(0,1fr))' },
            gap: 1.75,
            mb: 2,
          }}
        >
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
