// core (MUI)
import {
  heIL as heILCore,
} from '@mui/material/locale' ;
// date pickers (MUI)
import {
  enUS as enUSDate,
  heIL as heILDate,
} from '@mui/x-date-pickers/locales';
// data grid (MUI)
import {
  enUS as enUSDataGrid,
  heIL as heILDataGrid,
} from '@mui/x-data-grid/locales';

// ----------------------------------------------------------------------

export const allLangs = [
  {
    value: 'en',
    label: 'English',
    countryCode: 'GB',
    adapterLocale: 'en',
    numberFormat: { code: 'en-SG', currency: 'SGD' },
    systemValue: {
      components: { ...enUSDate.components, ...enUSDataGrid.components },
    },
  },
  {
    value: 'il',
    label: 'Hebrew',
    countryCode: 'IL',
    adapterLocale: 'he',
    numberFormat: { code: 'he-IL', currency: 'ILS' },
    systemValue: {
      components: { ...heILCore.components, ...heILDate.components, ...heILDataGrid.components },
    },
},
  // {
  //   value: 'vi',
  //   label: 'Vietnamese',
  //   countryCode: 'VN',
  //   adapterLocale: 'vi',
  //   numberFormat: { code: 'vi-VN', currency: 'VND' },
  //   systemValue: {
  //     components: { ...viVNCore.components, ...viVNDate.components, ...viVNDataGrid.components },
  //   },
  // },
  // {
  //   value: 'cn',
  //   label: 'Chinese',
  //   countryCode: 'CN',
  //   adapterLocale: 'zh-cn',
  //   numberFormat: { code: 'zh-CN', currency: 'CNY' },
  //   systemValue: {
  //     components: { ...zhCNCore.components, ...zhCNDate.components, ...zhCNDataGrid.components },
  //   },
  // },
  // {
  //   value: 'ar',
  //   label: 'Arabic',
  //   countryCode: 'SA',
  //   adapterLocale: 'ar-sa',
  //   numberFormat: { code: 'ar', currency: 'AED' },
  //   systemValue: {
  //     components: { ...arSACore.components, ...arSDDataGrid.components },
  //   },
  // },
];

/**
 * Country code:
 * https://flagcdn.com/en/codes.json
 *
 * Number format code:
 * https://gist.github.com/raushankrjha/d1c7e35cf87e69aa8b4208a8171a8416
 */
