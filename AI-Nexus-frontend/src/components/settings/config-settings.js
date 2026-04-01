import { defaultFont } from 'src/theme/core/typography';

// ----------------------------------------------------------------------

export const STORAGE_KEY = 'app-settings';

export const defaultSettings = {
  colorScheme: 'light',
  direction: 'ltr',
  contrast: 'default',
  navLayout: 'vertical',
  primaryColor: 'default',
  navColor: 'integrate',
  compactLayout: true,
  fontFamily: defaultFont,
  // Admin header visibility settings
  headerWorkspaces: false,
  headerLocalization: false,
  headerNotifications: false,
  headerContacts: false,
  headerSettings: true,
  headerAccount: true,
};
