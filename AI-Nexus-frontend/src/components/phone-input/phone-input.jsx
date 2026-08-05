import { useState, useEffect, forwardRef } from 'react';
import PhoneNumberInput from 'react-phone-number-input/input';
import { parsePhoneNumber } from 'react-phone-number-input';

import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

import { detectCountryCodeFromIp } from 'src/utils/detect-country-from-ip';

import { CountryListPopover } from './list';

// ----------------------------------------------------------------------

function countryFromPhoneValue(inputValue) {
  try {
    const phoneNumber = parsePhoneNumber(String(inputValue || '').trim());
    return phoneNumber?.country || null;
  } catch {
    return null;
  }
}

export const PhoneInput = forwardRef(
  (
    {
      value,
      onChange,
      placeholder,
      country: inputCountryCode,
      disableSelect,
      autoDetectCountry = true,
      disabled = false,
      ...other
    },
    ref
  ) => {
    const [selectedCountry, setSelectedCountry] = useState(() => {
      const fromValue = countryFromPhoneValue(value);
      if (fromValue) return fromValue;
      if (inputCountryCode) return inputCountryCode;
      return 'SG';
    });

    useEffect(() => {
      const fromValue = countryFromPhoneValue(value);
      if (fromValue) {
        setSelectedCountry(fromValue);
        return undefined;
      }

      if (inputCountryCode) {
        setSelectedCountry(inputCountryCode);
        return undefined;
      }

      if (!autoDetectCountry) return undefined;

      let active = true;
      void (async () => {
        const detected = await detectCountryCodeFromIp();
        if (!active || !detected) return;
        // Do not override if the number already includes a country.
        if (countryFromPhoneValue(value)) return;
        setSelectedCountry(String(detected).trim().toUpperCase());
      })();

      return () => {
        active = false;
      };
    }, [value, inputCountryCode, autoDetectCountry]);

    const hideCountrySelect = Boolean(disableSelect);

    return (
      <PhoneNumberInput
        ref={ref}
        country={selectedCountry}
        inputComponent={CustomInput}
        value={value}
        onChange={disabled ? undefined : onChange}
        placeholder={placeholder ?? 'Enter phone number'}
        disabled={disabled}
        InputProps={
          hideCountrySelect
            ? undefined
            : {
                startAdornment: (
                  <InputAdornment position="start" sx={{ ml: 1, ...(disabled && { pointerEvents: 'none', opacity: 0.7 }) }}>
                    <CountryListPopover
                      countryCode={selectedCountry}
                      onClickCountry={
                        disabled ? () => {} : (nextCountry) => setSelectedCountry(nextCountry)
                      }
                    />
                  </InputAdornment>
                ),
              }
        }
        {...other}
      />
    );
  }
);

// ----------------------------------------------------------------------

const CustomInput = forwardRef(({ ...props }, ref) => <TextField inputRef={ref} {...props} />);
