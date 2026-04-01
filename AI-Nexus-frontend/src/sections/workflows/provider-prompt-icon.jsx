import { Iconify } from 'src/components/iconify';

/** Strict dynamic icon from backend only. */
export function ProviderPromptIcon({ providerId, iconifyIcon, width = 24, sx }) {
  if (iconifyIcon) {
    return <Iconify icon={iconifyIcon} width={width} sx={sx} />;
  }

  return null;
}
