// Tokens from the Corporate Portal HTML design.

export const CORP = {
  navy: '#061833',
  ink: '#102033',
  blue: '#0d5fff',
  cyan: '#16b8ff',
  mint: '#2bd6a3',
  bg: '#f4f7fb',
  card: '#fff',
  muted: '#63748a',
  line: '#dfe7f1',
  warning: '#b45309',
  danger: '#dc2626',
  success: '#059669',
  shadow: '0 18px 50px rgba(6,24,51,.10)',
  radius: '24px',
};

export const STATUS_PILL_SX = {
  completed: { bgcolor: '#dcfce7', color: '#166534' },
  'in-progress': { bgcolor: '#dbeafe', color: '#1d4ed8' },
  'at-risk': { bgcolor: '#fee2e2', color: '#b91c1c' },
  default: { bgcolor: '#eef2f7', color: '#344256' },
};

export function statusTone(status = '') {
  return String(status).toLowerCase().replaceAll(' ', '-');
}
