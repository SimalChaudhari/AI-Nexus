// ----------------------------------------------------------------------

const MuiTypography = {
  /** **************************************
   * STYLE
   *************************************** */
  styleOverrides: {
    paragraph: ({ theme }) => ({ marginBottom: theme.spacing(2) }),
    gutterBottom: ({ theme }) => ({ marginBottom: theme.spacing(1) }),
    root: {
      wordBreak: 'break-word',
      overflowWrap: 'anywhere',
    },
  },
};

// ----------------------------------------------------------------------

export const typography = { MuiTypography };
