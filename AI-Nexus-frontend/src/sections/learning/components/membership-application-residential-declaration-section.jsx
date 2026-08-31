import { useEffect } from 'react';



import Box from '@mui/material/Box';

import Stack from '@mui/material/Stack';

import Alert from '@mui/material/Alert';

import Button from '@mui/material/Button';

import Radio from '@mui/material/Radio';

import RadioGroup from '@mui/material/RadioGroup';

import FormControl from '@mui/material/FormControl';

import FormHelperText from '@mui/material/FormHelperText';

import FormControlLabel from '@mui/material/FormControlLabel';

import Typography from '@mui/material/Typography';

import CircularProgress from '@mui/material/CircularProgress';



import { MembershipFormSectionTitleBlock } from 'src/components/membership-form-section-title';

import { RequiredMark } from 'src/utils/membership-form-required-mark';

import { buildResidentialDeclarationRadioOptions } from 'src/utils/membership-application-residential-declaration';

import {

  MEMBERSHIP_PICKLIST_CONFIG,

  useMembershipPicklist,

} from 'src/sections/learning/membership-application-picklists';



// ----------------------------------------------------------------------



const optionLabelSx = {

  m: 0,

  width: '100%',

  display: 'flex',

  flexDirection: 'row',

  alignItems: 'center',

  gap: 1,

  '& .MuiRadio-root': {

    flexShrink: 0,

    p: 0.75,

  },

  '& .MuiFormControlLabel-label': {

    flex: 1,

    margin: 0,

    lineHeight: 1.5,

  },

};



export function MembershipApplicationResidentialDeclarationSection({

  residentialDeclaration,

  applicationId,

  fieldErrors = {},

  onUpdate,

}) {

  const hasApplicationId = Boolean(applicationId?.trim());

  const selectedValue = residentialDeclaration.residentialDeclaration || '';

  const residentialError = fieldErrors.residentialDeclaration;



  const residentialDeclarationPicklist = useMembershipPicklist({

    enabled: hasApplicationId,

    ...MEMBERSHIP_PICKLIST_CONFIG.residentialDeclaration,

  });



  const picklistLoaded = residentialDeclarationPicklist.options.length > 0;

  const picklistFailed = Boolean(residentialDeclarationPicklist.error);

  const showPicklistLoader =

    hasApplicationId

    && residentialDeclarationPicklist.loading

    && !picklistLoaded

    && !picklistFailed;



  const radioOptions = buildResidentialDeclarationRadioOptions(

    residentialDeclarationPicklist.options,

    selectedValue,

    { useFallback: picklistFailed }

  );



  useEffect(() => {

    if (hasApplicationId) {

      residentialDeclarationPicklist.load();

    }

  }, [hasApplicationId, residentialDeclarationPicklist.load]);



  return (

    <Stack spacing={3} sx={{ width: 1 }}>

      {!hasApplicationId && (

        <Alert severity="warning">

          Submit the Application tab first to obtain an application ID.

        </Alert>

      )}



      {picklistFailed && (

        <Alert

          severity="error"

          action={

            <Button size="small" color="inherit" onClick={residentialDeclarationPicklist.retry}>

              Retry

            </Button>

          }

        >

          {residentialDeclarationPicklist.error}

        </Alert>

      )}



      <MembershipFormSectionTitleBlock

        title={

          <>

            Residential declaration

            <RequiredMark />

          </>

        }

        firstSection

      />



      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>

        At the point of payment, please declare if your usual place of residence is outside of

        Singapore. The GST amount will be zero-rated if you declare that you reside overseas.

      </Typography>



      {showPicklistLoader ? (

        <Stack alignItems="center" spacing={1} sx={{ py: 2 }}>

          <CircularProgress size={24} />

          <Typography variant="body2" color="text.secondary">

            Loading declaration options…

          </Typography>

        </Stack>

      ) : (

        <FormControl error={Boolean(residentialError)} sx={{ width: 1 }}>

          <Box>

            <RadioGroup

              value={selectedValue}

              onChange={(e) => onUpdate('residentialDeclaration', e.target.value)}

              sx={{ gap: 1.5 }}

            >

              {radioOptions.map((option) => (

                <FormControlLabel

                  key={option.value}

                  value={option.value}

                  control={<Radio />}

                  label={

                    <Typography variant="body2" component="span" sx={{ color: 'text.primary' }}>

                      {option.label}

                    </Typography>

                  }

                  sx={optionLabelSx}

                />

              ))}

            </RadioGroup>

          </Box>

          {residentialError ? <FormHelperText>{residentialError}</FormHelperText> : null}

        </FormControl>

      )}

    </Stack>

  );

}

