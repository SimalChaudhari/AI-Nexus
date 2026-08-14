import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import useMediaQuery from '@mui/material/useMediaQuery';
import Tab from '@mui/material/Tab';
import Tooltip from '@mui/material/Tooltip';
import LoadingButton from '@mui/lab/LoadingButton';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { alpha, useTheme } from '@mui/material/styles';
import dayjs from 'dayjs';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomTabs } from 'src/components/custom-tabs';
import {
  emptyRows,
  getComparator,
  rowInPage,
  TableEmptyRows,
  TableHeadCustom,
  TableNoData,
  TablePaginationCustom,
  useTable,
} from 'src/components/table';
import { COUNTRY_PRICING_CATALOG } from 'src/utils/country-pricing-catalog';
import { useTabs } from 'src/hooks/use-tabs';
import {
  createVoucherCode,
  deleteVoucherCode,
  listVoucherCodes,
  updateVoucherCode,
} from 'src/services/affiliate.service';

import { intlPaymentAdminService } from 'src/services/intl-payment-admin.service';
import { DashboardContent } from 'src/layouts/dashboard';

const INTL_REFERRAL_PATH = '/auth/sign-up?ref=';
const AINEXUS_REFERRAL_PATH = '/auth/sign-up?membershipOutcome=paid-signup&ref=';

const COUNTRY_CATALOG = COUNTRY_PRICING_CATALOG;

const PROMO_TABLE_HEAD = [
  { id: 'code', label: 'Code', width: 160 },
  { id: 'country', label: 'Countries' },
  { id: 'discountPrice', label: 'Special Price', width: 160 },
  { id: 'maxRedemptions', label: 'User limit', width: 120 },
  { id: 'expiresAt', label: 'Valid Till', width: 140 },
  { id: 'status', label: 'Status', width: 110 },
  { id: 'signupLink', label: 'Signup link', width: 140 },
  { id: '', label: 'Actions', align: 'right', width: 88 },
];

const PRICING_TABS = [
  { value: 'countries', label: 'Pricing Management', icon: 'solar:global-bold' },
  { value: 'promo', label: 'Promo / Affiliate Codes', icon: 'solar:ticket-bold-duotone' },
  { value: 'defaults', label: 'Default Price', icon: 'solar:tag-price-bold' },
];

const EMPTY_COUNTRY_FORM = {
  code: 'TH',
  basePrice: '',
  discountPrice: '',
  active: true,
};

const EMPTY_PROMO_FORM = {
  code: '',
  countryCodes: [],
  promoPrices: {},
  maxRedemptions: '',
  expiresAt: null,
  isActive: true,
};

const ZERO_DECIMAL = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);

function flagUrl(code) {
  return `https://flagcdn.com/w40/${String(code || '').toLowerCase()}.png`;
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Number.isInteger(n) ? n : Number(n.toFixed(2));
}

function sortByComparator(inputData, comparator) {
  const stabilized = inputData.map((el, index) => [el, index]);
  stabilized.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilized.map((el) => el[0]);
}

function convertSgdAmount(amountSgd, currency, rates) {
  const n = Number(amountSgd);
  if (!Number.isFinite(n) || n <= 0) return null;
  const cur = String(currency || 'SGD').toUpperCase() || 'SGD';
  if (cur === 'SGD') return Number.isInteger(n) ? n : Number(n.toFixed(2));
  const rate = Number(rates?.[cur]);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  const raw = n * rate;
  return ZERO_DECIMAL.has(cur) ? Math.round(raw) : Number(raw.toFixed(2));
}

function countriesForPromo(voucher, rows) {
  const code = String(voucher?.code || '').trim().toUpperCase();
  if (!code) return [];
  return (rows || []).filter(
    (row) => String(row.promoCode || '').toUpperCase() === code,
  );
}

function catalogByCode(code) {
  return COUNTRY_CATALOG.find((row) => row.code === code) || null;
}

function resolveWebsiteBaseUrl(configured) {
  const fromSettings = String(configured || '').trim().replace(/\/$/, '');
  if (fromSettings) return fromSettings;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return String(window.location.origin).replace(/\/$/, '');
  }
  return '';
}

function buildFullReferralLink(websiteBaseUrl, code, referralLinkPath) {
  const base = resolveWebsiteBaseUrl(websiteBaseUrl);
  const path = String(referralLinkPath || '').trim() || AINEXUS_REFERRAL_PATH;
  const normalizedCode = String(code || '').trim().toUpperCase();
  if (!normalizedCode) return '';
  if (!base) return `${path}${normalizedCode}`;
  return `${base}${path}${normalizedCode}`;
}

function normalizeCountryList(cfg) {
  const fromApi = Array.isArray(cfg?.countryPricingList) ? cfg.countryPricingList : [];
  const fromMap =
    cfg?.countryPricing && typeof cfg.countryPricing === 'object' && !Array.isArray(cfg.countryPricing)
      ? cfg.countryPricing
      : {};
  const byCode = new Map();
  Object.entries(fromMap).forEach(([code, row]) => {
    byCode.set(String(code || '').toUpperCase(), row || {});
  });
  fromApi.forEach((row) => {
    const code = String(row?.code || '').toUpperCase();
    if (!code) return;
    byCode.set(code, { ...byCode.get(code), ...row });
  });
  return COUNTRY_CATALOG.map((row) => {
    const saved = byCode.get(row.code) || {};
    return {
      code: row.code,
      name: row.name,
      currency: row.currency,
      basePrice: toAmount(saved.basePrice),
      discountPrice: toAmount(saved.discountPrice),
      active: saved.active !== false,
      promoCode: saved.promoCode ? String(saved.promoCode).toUpperCase() : null,
    };
  });
}

function rowsToPricingMap(rows) {
  const map = {};
  rows.forEach((row) => {
    map[row.code] = {
      basePrice: toAmount(row.basePrice),
      discountPrice: toAmount(row.discountPrice),
      active: row.active !== false,
      promoCode: row.promoCode || null,
    };
  });
  return map;
}

function StatCard({ title, value, icon, color }) {
  return (
    <Card sx={{ p: 2.25, height: 1 }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(color, 0.12),
            color,
            flexShrink: 0,
          }}
        >
          <Iconify icon={icon} width={22} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.15 }}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
        </Box>
      </Stack>
    </Card>
  );
}

function CountryFlag({ code }) {
  return (
    <Box
      component="img"
      src={flagUrl(code)}
      alt=""
      sx={{ width: 22, height: 16, objectFit: 'cover', borderRadius: '2px', display: 'block' }}
    />
  );
}

export function CountryPricingManagementPanel({
  title = '',
  subtitle = '',
  voucherSite = 'international',
  fetchSettings,
  saveSettings,
}) {
  const [settings, setSettings] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingCountry, setSavingCountry] = useState(false);
  const [savingPromo, setSavingPromo] = useState(false);
  const [search, setSearch] = useState('');
  const [countryForm, setCountryForm] = useState(EMPTY_COUNTRY_FORM);
  const [promoForm, setPromoForm] = useState(EMPTY_PROMO_FORM);
  const [editingCode, setEditingCode] = useState('TH');
  const [promoRows, setPromoRows] = useState([]);
  const [editingPromoId, setEditingPromoId] = useState(null);
  const [showCountryPanel, setShowCountryPanel] = useState(false);
  const [showPromoPanel, setShowPromoPanel] = useState(false);
  const [promoPriceDialogOpen, setPromoPriceDialogOpen] = useState(false);
  const [promoDialogSearch, setPromoDialogSearch] = useState('');
  const [fxRates, setFxRates] = useState({ SGD: 1 });
  const [loadingFx, setLoadingFx] = useState(false);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [defaultForm, setDefaultForm] = useState({
    baseAmount: '',
    studentAmount: '',
    discountAmount: '',
    gstRatePercent: '',
  });
  const countryFormRef = useRef(null);
  const promoFormRef = useRef(null);
  const theme = useTheme();
  const isMobilePromoDialog = useMediaQuery(theme.breakpoints.down('sm'));
  const table = useTable({ defaultRowsPerPage: 10, defaultCurrentPage: 0 });
  const promoTable = useTable({ defaultRowsPerPage: 5, defaultCurrentPage: 0, defaultOrderBy: 'code' });
  const tabs = useTabs('countries');

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await fetchSettings();
      setSettings(cfg || {});
      setRows(normalizeCountryList(cfg));
      const isIntl = voucherSite === 'international';
      setDefaultForm({
        baseAmount: isIntl ? (cfg?.baseAmountSgd ?? '') : (cfg?.baseAmount ?? ''),
        studentAmount: cfg?.studentAmountSgd ?? '',
        discountAmount: isIntl
          ? (cfg?.voucherDiscountAmountSgd ?? '')
          : (cfg?.voucherDiscountAmount ?? ''),
        gstRatePercent: cfg?.gstRatePercent ?? '',
      });
    } catch (error) {
      toast.error(error?.message || 'Failed to load country pricing');
      setSettings({});
      setRows(normalizeCountryList(null));
    } finally {
      setLoading(false);
    }
  }, [fetchSettings, voucherSite]);

  const loadPromos = useCallback(async () => {
    try {
      const data = await listVoucherCodes(voucherSite);
      setPromoRows(Array.isArray(data) ? data : []);
    } catch (error) {
      setPromoRows([]);
    }
  }, [voucherSite]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    loadPromos();
  }, [loadPromos]);

  useEffect(() => {
    if (tabs.value !== 'countries') setShowCountryPanel(false);
    if (tabs.value !== 'promo') {
      setShowPromoPanel(false);
      setPromoPriceDialogOpen(false);
    }
  }, [tabs.value]);

  useEffect(() => {
    if (!promoPriceDialogOpen) return undefined;
    setPromoDialogSearch('');
    let cancelled = false;
    setLoadingFx(true);
    intlPaymentAdminService
      .getFxRates()
      .then((rates) => {
        if (!cancelled) {
          setFxRates(rates && typeof rates === 'object' ? { SGD: 1, ...rates } : { SGD: 1 });
        }
      })
      .catch(() => {
        if (!cancelled) setFxRates({ SGD: 1 });
      })
      .finally(() => {
        if (!cancelled) setLoadingFx(false);
      });
    return () => {
      cancelled = true;
    };
  }, [promoPriceDialogOpen]);

  const persistRows = async (nextRows) => {
    setRows(nextRows);
    await saveSettings(rowsToPricingMap(nextRows), settings);
    const fresh = await fetchSettings();
    setSettings(fresh || {});
    const next = normalizeCountryList(fresh);
    setRows(next);
    return next;
  };

  const scrollTo = (ref) => {
    requestAnimationFrame(() => {
      ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(q)
        || row.code.toLowerCase().includes(q)
        || row.currency.toLowerCase().includes(q)
        || String(row.promoCode || '').toLowerCase().includes(q),
    );
  }, [rows, search]);

  useEffect(() => {
    table.onResetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const paginatedRows = useMemo(() => {
    const start = table.page * table.rowsPerPage;
    return filteredRows.slice(start, start + table.rowsPerPage);
  }, [filteredRows, table.page, table.rowsPerPage]);

  const stats = useMemo(() => {
    const currencies = new Set(rows.map((row) => row.currency));
    return {
      countries: rows.length,
      currencies: currencies.size,
      withDiscount: rows.filter((row) => Number(row.discountPrice) > 0).length,
      orders: Number(settings?.paidOrderCount) || 0,
    };
  }, [rows, settings]);

  const selectedCountry = catalogByCode(countryForm.code) || catalogByCode('TH') || COUNTRY_CATALOG[0];
  const selectedPromoCountries = useMemo(
    () => COUNTRY_CATALOG.filter((row) => (promoForm.countryCodes || []).includes(row.code)),
    [promoForm.countryCodes],
  );
  const filteredPromoDialogCountries = useMemo(() => {
    const q = promoDialogSearch.trim().toLowerCase();
    if (!q) return selectedPromoCountries;
    return selectedPromoCountries.filter(
      (row) =>
        row.name.toLowerCase().includes(q)
        || row.code.toLowerCase().includes(q)
        || String(row.currency || '').toLowerCase().includes(q),
    );
  }, [selectedPromoCountries, promoDialogSearch]);
  const unselectedPromoCountries = useMemo(
    () => COUNTRY_CATALOG.filter((row) => !(promoForm.countryCodes || []).includes(row.code)),
    [promoForm.countryCodes],
  );
  const allPromoCountriesSelected = selectedPromoCountries.length === COUNTRY_CATALOG.length;
  const defaultSgdAmount = toAmount(defaultForm.baseAmount);
  const referralLinkPath =
    String(settings?.referralLinkPath || '').trim()
    || (voucherSite === 'international' ? INTL_REFERRAL_PATH : AINEXUS_REFERRAL_PATH);
  const websiteBaseUrl = String(settings?.websiteBaseUrl || '').trim();

  const fillCountryForm = (row, { scroll = true } = {}) => {
    if (!row) return;
    tabs.setValue('countries');
    setShowCountryPanel(true);
    setEditingCode(row.code);
    setCountryForm({
      code: row.code,
      basePrice: row.basePrice ?? '',
      discountPrice: row.discountPrice ?? '',
      active: row.active !== false,
    });
    if (scroll) scrollTo(countryFormRef);
  };

  const closeCountryPanel = () => {
    setShowCountryPanel(false);
    setCountryForm(EMPTY_COUNTRY_FORM);
  };

  const fillPromoForm = (voucher) => {
    tabs.setValue('promo');
    setShowPromoPanel(true);
    const code = String(voucher?.code || '').toUpperCase();
    const linked = countriesForPromo({ code }, rows);
    const promoPrices = {};
    linked.forEach((row) => {
      promoPrices[row.code] = row.discountPrice ?? '';
    });
    setEditingPromoId(voucher?.id || null);
    setPromoForm({
      code,
      countryCodes: linked.map((row) => row.code),
      promoPrices,
      maxRedemptions:
        voucher?.maxRedemptions != null && voucher.maxRedemptions !== ''
          ? String(voucher.maxRedemptions)
          : '',
      expiresAt: voucher?.expiresAt ? dayjs(voucher.expiresAt) : null,
      isActive: voucher ? voucher.isActive !== false : true,
    });
    scrollTo(promoFormRef);
    setPromoPriceDialogOpen(false);
  };

  const resetPromoForm = () => {
    tabs.setValue('promo');
    setEditingPromoId(null);
    setPromoForm(EMPTY_PROMO_FORM);
    setShowPromoPanel(true);
    setPromoPriceDialogOpen(false);
  };

  const closePromoPanel = () => {
    setEditingPromoId(null);
    setPromoForm(EMPTY_PROMO_FORM);
    setShowPromoPanel(false);
    setPromoPriceDialogOpen(false);
  };

  const handlePromoCountriesChange = (nextCodes) => {
    const codes = Array.from(new Set((nextCodes || []).map((code) => String(code || '').toUpperCase())));
    setPromoForm((prev) => {
      const promoPrices = { ...prev.promoPrices };
      codes.forEach((code) => {
        if (promoPrices[code] == null || promoPrices[code] === '') {
          const row = rows.find((item) => item.code === code);
          if (row && String(row.promoCode || '').toUpperCase() === String(prev.code || '').toUpperCase() && row.discountPrice != null) {
            promoPrices[code] = row.discountPrice;
          }
        }
      });
      Object.keys(promoPrices).forEach((code) => {
        if (!codes.includes(code)) delete promoPrices[code];
      });
      return { ...prev, countryCodes: codes, promoPrices };
    });
  };

  const togglePromoDialogCountry = (code, checked) => {
    const current = promoForm.countryCodes || [];
    handlePromoCountriesChange(
      checked ? [...current, code] : current.filter((item) => item !== code),
    );
  };

  const toggleAllPromoDialogCountries = (checked) => {
    handlePromoCountriesChange(checked ? COUNTRY_CATALOG.map((row) => row.code) : []);
  };

  const openPromoPriceDialog = () => {
    setPromoPriceDialogOpen(true);
  };

  const handleSaveCountry = async () => {
    const code = String(countryForm.code || '').toUpperCase();
    const basePrice = toAmount(countryForm.basePrice);
    if (!code) {
      toast.error('Select a country');
      return;
    }
    if (basePrice == null) {
      toast.error('Base price is required');
      return;
    }
    setSavingCountry(true);
    try {
      const nextRows = rows.map((row) =>
        row.code === code
          ? {
              ...row,
              basePrice,
              active: countryForm.active !== false,
            }
          : row,
      );
      await persistRows(nextRows);
      closeCountryPanel();
      toast.success(`${catalogByCode(code)?.name || code} pricing saved`);
    } catch (error) {
      toast.error(error?.message || 'Could not save country pricing');
      await loadSettings();
    } finally {
      setSavingCountry(false);
    }
  };

  const handleToggleActive = async (row) => {
    try {
      const nextRows = rows.map((item) =>
        item.code === row.code ? { ...item, active: !item.active } : item,
      );
      await persistRows(nextRows);
    } catch (error) {
      toast.error(error?.message || 'Could not update status');
      await loadSettings();
    }
  };

  const handleDeleteCountry = async (row) => {
    try {
      const nextRows = rows.map((item) =>
        item.code === row.code
          ? { ...item, basePrice: null, discountPrice: null, promoCode: null, active: true }
          : item,
      );
      await persistRows(nextRows);
      if (countryForm.code === row.code) closeCountryPanel();
      toast.success(`${row.name} pricing cleared`);
    } catch (error) {
      toast.error(error?.message || 'Could not delete country pricing');
    }
  };

  const handleSavePromo = async () => {
    const code = String(promoForm.code || '').trim().toUpperCase();
    const countryCodes = Array.from(
      new Set((promoForm.countryCodes || []).map((item) => String(item || '').toUpperCase()).filter(Boolean)),
    );
    if (!code) {
      toast.error('Promo code is required');
      return;
    }
    if (!/^[A-Z0-9_-]{2,64}$/.test(code)) {
      toast.error('Promo code may only use letters, numbers, underscore or hyphen');
      return;
    }

    const pricedCountryCodes = countryCodes.filter(
      (item) => toAmount(promoForm.promoPrices?.[item]) != null,
    );

    const maxRaw = String(promoForm.maxRedemptions ?? '').trim();
    let maxRedemptions = null;
    if (maxRaw) {
      const parsed = Number(maxRaw);
      if (!Number.isInteger(parsed) || parsed < 1) {
        toast.error('User limit must be a whole number of at least 1, or leave blank for unlimited');
        return;
      }
      maxRedemptions = parsed;
    }

    setSavingPromo(true);
    try {
      const expiresAt = promoForm.expiresAt
        ? dayjs(promoForm.expiresAt).endOf('day').toISOString()
        : null;
      const payload = {
        code,
        label: pricedCountryCodes.length === 1
          ? `${catalogByCode(pricedCountryCodes[0])?.name || pricedCountryCodes[0]} promo`
          : pricedCountryCodes.length
            ? `${pricedCountryCodes.length} countries`
            : `${countryCodes.length} countries`,
        site: voucherSite,
        isActive: promoForm.isActive !== false,
        maxRedemptions,
        expiresAt,
      };
      const existing = await listVoucherCodes(voucherSite);
      const found =
        (editingPromoId && (Array.isArray(existing) ? existing : []).find((item) => item.id === editingPromoId))
        || (Array.isArray(existing) ? existing : []).find(
          (item) => String(item.code || '').toUpperCase() === code,
        );
      if (found?.id) {
        await updateVoucherCode(found.id, payload);
      } else {
        try {
          await createVoucherCode(payload);
        } catch (error) {
          const message = String(error?.message || '');
          if (!message.toLowerCase().includes('already exists')) throw error;
          const latest = await listVoucherCodes(voucherSite);
          const again = (Array.isArray(latest) ? latest : []).find(
            (item) => String(item.code || '').toUpperCase() === code,
          );
          if (!again?.id) throw error;
          await updateVoucherCode(again.id, payload);
        }
      }

      const priced = new Set(pricedCountryCodes);
      const nextRows = rows.map((row) => {
        if (priced.has(row.code)) {
          return {
            ...row,
            discountPrice: toAmount(promoForm.promoPrices?.[row.code]),
            promoCode: code,
            active: true,
          };
        }
        if (String(row.promoCode || '').toUpperCase() === code) {
          return { ...row, promoCode: null };
        }
        return row;
      });
      await persistRows(nextRows);
      await loadPromos();
      closePromoPanel();
      toast.success(
        pricedCountryCodes.length
          ? `Promo ${code} saved for ${pricedCountryCodes.length} ${pricedCountryCodes.length === 1 ? 'country' : 'countries'}`
          : `Promo ${code} saved`,
      );
    } catch (error) {
      toast.error(error?.message || 'Could not save promo code');
      await loadPromos();
    } finally {
      setSavingPromo(false);
    }
  };

  const handleDeletePromo = async (voucher) => {
    if (!voucher?.id) return;
    try {
      await deleteVoucherCode(voucher.id);
      const nextRows = rows.map((row) =>
        String(row.promoCode || '').toUpperCase() === String(voucher.code || '').toUpperCase()
          ? { ...row, promoCode: null }
          : row,
      );
      await persistRows(nextRows);
      if (editingPromoId === voucher.id) closePromoPanel();
      await loadPromos();
      toast.success(`Promo ${voucher.code} deleted`);
    } catch (error) {
      toast.error(error?.message || 'Could not delete promo code');
    }
  };

  const handleCopyPromoCode = async (code) => {
    const value = String(code || '').trim().toUpperCase();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`Copied ${value}`);
    } catch {
      toast.error('Could not copy promo code');
    }
  };

  const handleCopySignupLink = async (code) => {
    const link = buildFullReferralLink(websiteBaseUrl, code, referralLinkPath);
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Signup link copied');
    } catch {
      toast.error('Could not copy signup link');
    }
  };

  const handleAddCountry = () => {
    tabs.setValue('countries');
    const empty = rows.find((row) => row.basePrice == null) || rows[0];
    fillCountryForm(empty);
  };

  const isIntlSite = voucherSite === 'international';

  const handleSaveDefaults = async () => {
    const basePrice = toAmount(defaultForm.baseAmount);
    const discountPrice = toAmount(defaultForm.discountAmount);
    if (basePrice == null) {
      toast.error('Default base price is required');
      return;
    }
    if (discountPrice == null) {
      toast.error('Default promo price is required');
      return;
    }
    setSavingDefaults(true);
    try {
      const nextSettings = isIntlSite
        ? {
            ...settings,
            baseAmountSgd: basePrice,
            studentAmountSgd: toAmount(defaultForm.studentAmount) ?? settings?.studentAmountSgd ?? 150,
            voucherDiscountAmountSgd: discountPrice,
          }
        : {
            ...settings,
            baseAmount: basePrice,
            voucherDiscountAmount: discountPrice,
            gstRatePercent: Number(defaultForm.gstRatePercent) >= 0
              ? Number(defaultForm.gstRatePercent)
              : settings?.gstRatePercent,
          };
      await saveSettings(rowsToPricingMap(rows), nextSettings);
      const fresh = await fetchSettings();
      setSettings(fresh || nextSettings);
      toast.success('Default pricing saved');
    } catch (error) {
      toast.error(error?.message || 'Could not save default pricing');
    } finally {
      setSavingDefaults(false);
    }
  };

  const promoTableRows = useMemo(
    () =>
      (promoRows || []).map((voucher) => {
        const countryList = countriesForPromo(voucher, rows);
        return {
          voucher,
          countryList,
          code: voucher.code || '',
          country: countryList.map((row) => row.name).join(', ') || 'Default',
          discountPrice: Number(countryList[0]?.discountPrice) || 0,
          maxRedemptions: Number(voucher.maxRedemptions) || 0,
          expiresAt: voucher.expiresAt || '',
          status: voucher.isActive === false ? 'Inactive' : 'Active',
        };
      }),
    [promoRows, rows],
  );

  const sortedPromoRows = useMemo(
    () => sortByComparator(promoTableRows, getComparator(promoTable.order, promoTable.orderBy)),
    [promoTableRows, promoTable.order, promoTable.orderBy],
  );

  const paginatedPromoRows = useMemo(
    () => rowInPage(sortedPromoRows, promoTable.page, promoTable.rowsPerPage),
    [sortedPromoRows, promoTable.page, promoTable.rowsPerPage],
  );

  const promoNotFound = !promoTableRows.length;

  const defaultPromoAmount = toAmount(defaultForm.discountAmount);

  const handleExport = () => {
    const header = ['Country', 'Currency', 'Base Price', 'Discount Price', 'Promo Code', 'Status'];
    const lines = [
      header.join(','),
      ...rows.map((row) =>
        [
          row.name,
          row.currency,
          row.basePrice ?? '',
          row.discountPrice ?? '',
          row.promoCode || '',
          row.active ? 'Active' : 'Inactive',
        ].join(','),
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'international-country-pricing.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {title ? (
        <Stack spacing={0.5} sx={{ mb: 3 }}>
          <Typography variant="h4">{title}</Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          ) : null}
        </Stack>
      ) : null}

      {loading ? (
        <Stack alignItems="center" py={10}>
          <CircularProgress />
        </Stack>
      ) : (
        <Stack spacing={3}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Countries"
                value={stats.countries}
                icon="solar:global-bold-duotone"
                color="#2563eb"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Currencies"
                value={stats.currencies}
                icon="solar:dollar-bold-duotone"
                color="#16a34a"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Countries with Discount"
                value={stats.withDiscount}
                icon="solar:tag-price-bold-duotone"
                color="#d97706"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Orders (All Countries)"
                value={stats.orders.toLocaleString('en-US')}
                icon="solar:users-group-rounded-bold-duotone"
                color="#4f46e5"
              />
            </Grid>
          </Grid>

          <CustomTabs
            value={tabs.value}
            onChange={tabs.onChange}
            variant="scrollable"
            allowScrollButtonsMobile
            sx={{ width: 1, borderRadius: 1 }}
          >
            {PRICING_TABS.map((tab) => (
              <Tab
                key={tab.value}
                value={tab.value}
                label={tab.label}
                icon={<Iconify icon={tab.icon} width={18} />}
                iconPosition="start"
              />
            ))}
          </CustomTabs>

          {tabs.value === 'defaults' ? (
          <Card sx={{ p: 2.5 }}>
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              Default Price
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Used on signup when the selected country has no base or discount price set below.
            </Typography>
            <Grid container spacing={2} alignItems="flex-end">
              <Grid item xs={12} sm={6} md={isIntlSite ? 3 : 4}>
                <TextField
                  size="small"
                  fullWidth
                  type="number"
                  label={isIntlSite ? 'Default full / role (SGD)' : 'Default base price (SGD)'}
                  value={defaultForm.baseAmount}
                  onChange={(event) =>
                    setDefaultForm((prev) => ({ ...prev, baseAmount: event.target.value }))
                  }
                  inputProps={{ min: 0, step: '1' }}
                />
              </Grid>
              {isIntlSite ? (
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    size="small"
                    fullWidth
                    type="number"
                    label="Default student (SGD)"
                    value={defaultForm.studentAmount}
                    onChange={(event) =>
                      setDefaultForm((prev) => ({ ...prev, studentAmount: event.target.value }))
                    }
                    inputProps={{ min: 0, step: '1' }}
                  />
                </Grid>
              ) : (
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    size="small"
                    fullWidth
                    type="number"
                    label="GST % (Singapore default only)"
                    value={defaultForm.gstRatePercent}
                    onChange={(event) =>
                      setDefaultForm((prev) => ({ ...prev, gstRatePercent: event.target.value }))
                    }
                    inputProps={{ min: 0, step: '0.01' }}
                  />
                </Grid>
              )}
              <Grid item xs={12} sm={6} md={isIntlSite ? 3 : 4}>
                <TextField
                  size="small"
                  fullWidth
                  type="number"
                  label={isIntlSite ? 'Default promo (SGD)' : 'Default promo price (SGD)'}
                  value={defaultForm.discountAmount}
                  onChange={(event) =>
                    setDefaultForm((prev) => ({ ...prev, discountAmount: event.target.value }))
                  }
                  inputProps={{ min: 0, step: '1' }}
                />
              </Grid>
              <Grid item xs={12} md={isIntlSite ? 3 : 12}>
                <LoadingButton
                  variant="contained"
                  loading={savingDefaults}
                  onClick={handleSaveDefaults}
                >
                  Save Default Price
                </LoadingButton>
              </Grid>
            </Grid>
          </Card>
          ) : null}

          {tabs.value === 'promo' ? (
          <Grid container spacing={2.5} alignItems="flex-start">
            <Grid item xs={12} lg={showPromoPanel ? 8 : 12}>
              <Card>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  alignItems={{ sm: 'center' }}
                  justifyContent="space-between"
                  sx={{ p: 2.5, pb: 2 }}
                >
                  <Box>
                    <Typography variant="h6">Promo / Affiliate Codes</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {promoTableRows.length} code{promoTableRows.length === 1 ? '' : 's'}
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<Iconify icon="mingcute:add-line" width={18} />}
                    onClick={resetPromoForm}
                  >
                    New Promo Code
                  </Button>
                </Stack>
                <Box sx={{ position: 'relative' }}>
                  <Scrollbar>
                    <Table size={promoTable.dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
                      <TableHeadCustom
                        order={promoTable.order}
                        orderBy={promoTable.orderBy}
                        headLabel={PROMO_TABLE_HEAD}
                        onSort={promoTable.onSort}
                      />
                      <TableBody>
                        {paginatedPromoRows.map(({ voucher, countryList }) => {
                          const signupLink = buildFullReferralLink(
                            websiteBaseUrl,
                            voucher.code,
                            referralLinkPath,
                          );
                          const priceLabel = !countryList?.length
                            ? (defaultPromoAmount ? `SGD ${formatMoney(defaultPromoAmount)}` : '—')
                            : countryList.length === 1
                              ? `${countryList[0].currency || ''} ${formatMoney(countryList[0].discountPrice)}`.trim()
                              : `${countryList.length} prices`;
                          return (
                            <TableRow
                              key={voucher.id || voucher.code}
                              hover
                              selected={showPromoPanel && editingPromoId === voucher.id}
                            >
                              <TableCell>
                                <Chip
                                  size="small"
                                  color="success"
                                  label={voucher.code}
                                  sx={{ height: 24, fontWeight: 700 }}
                                />
                              </TableCell>
                              <TableCell>
                                {!countryList?.length ? (
                                  <Typography variant="body2" color="text.secondary">
                                    Default
                                  </Typography>
                                ) : countryList.length === 1 ? (
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <CountryFlag code={countryList[0].code} />
                                    <Typography variant="body2">{countryList[0].name}</Typography>
                                  </Stack>
                                ) : (
                                  <Tooltip title={countryList.map((row) => row.name).join(', ')}>
                                    <Chip
                                      size="small"
                                      label={`${countryList.length} countries`}
                                      onClick={() => fillPromoForm(voucher)}
                                      sx={{ height: 24, fontWeight: 700, cursor: 'pointer' }}
                                    />
                                  </Tooltip>
                                )}
                              </TableCell>
                              <TableCell sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                                <Button
                                  size="small"
                                  color="inherit"
                                  onClick={() => fillPromoForm(voucher)}
                                  sx={{ px: 1 }}
                                >
                                  {priceLabel}
                                </Button>
                              </TableCell>
                              <TableCell>
                                {voucher.maxRedemptions != null
                                  ? `${Number(voucher.redemptionCount || 0)} / ${voucher.maxRedemptions}`
                                  : 'Unlimited'}
                              </TableCell>
                              <TableCell>
                                {voucher.expiresAt && dayjs(voucher.expiresAt).isValid()
                                  ? dayjs(voucher.expiresAt).format('DD MMM YYYY')
                                  : 'No expiry'}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  color={voucher.isActive === false ? 'default' : 'success'}
                                  label={voucher.isActive === false ? 'Inactive' : 'Active'}
                                />
                              </TableCell>
                              <TableCell>
                                <Tooltip title={signupLink || 'Copy signup link'}>
                                  <Button
                                    size="small"
                                    color="inherit"
                                    startIcon={<Iconify icon="solar:copy-bold" width={16} />}
                                    onClick={() => handleCopySignupLink(voucher.code)}
                                    sx={{ px: 1 }}
                                  >
                                    Copy link
                                  </Button>
                                </Tooltip>
                              </TableCell>
                              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                <Tooltip title="Edit">
                                  <IconButton
                                    color="default"
                                    onClick={() => fillPromoForm(voucher)}
                                  >
                                    <Iconify icon="solar:pen-bold" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton color="error" onClick={() => handleDeletePromo(voucher)}>
                                    <Iconify icon="solar:trash-bin-trash-bold" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        <TableEmptyRows
                          height={promoTable.dense ? 56 : 76}
                          emptyRows={emptyRows(promoTable.page, promoTable.rowsPerPage, promoTableRows.length)}
                        />
                        <TableNoData notFound={promoNotFound} />
                      </TableBody>
                    </Table>
                  </Scrollbar>
                </Box>
                <TablePaginationCustom
                  page={promoTable.page}
                  dense={promoTable.dense}
                  count={promoTableRows.length}
                  rowsPerPage={promoTable.rowsPerPage}
                  onPageChange={promoTable.onChangePage}
                  onChangeDense={promoTable.onChangeDense}
                  onRowsPerPageChange={promoTable.onChangeRowsPerPage}
                  rowsPerPageOptions={[5, 10, 20, 30]}
                />
              </Card>
            </Grid>

            {showPromoPanel ? (
              <Grid item xs={12} lg={4}>
                <Box ref={promoFormRef}>
                  <Card sx={{ p: 2.5 }}>
                    <Typography variant="h6" sx={{ mb: 0.5 }}>
                      {editingPromoId ? 'Edit Promo Code' : 'New Promo Code'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {editingPromoId
                        ? `Updating ${promoForm.code || 'promo code'}.`
                        : 'Create a promo code, then set country prices in the popup.'}
                    </Typography>
                    <Stack spacing={1.75}>
                      <TextField
                        size="small"
                        fullWidth
                        label="Promo Code"
                        placeholder="TWILLO100"
                        value={promoForm.code}
                        onChange={(event) =>
                          setPromoForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))
                        }
                        InputProps={{
                          endAdornment: promoForm.code ? (
                            <InputAdornment position="end">
                              <Tooltip title="Copy promo code">
                                <IconButton
                                  size="small"
                                  edge="end"
                                  onClick={() => handleCopyPromoCode(promoForm.code)}
                                >
                                  <Iconify icon="solar:copy-bold" width={16} />
                                </IconButton>
                              </Tooltip>
                            </InputAdornment>
                          ) : null,
                        }}
                      />
                      <Button
                        variant="outlined"
                        color="inherit"
                        startIcon={<Iconify icon="solar:tag-price-bold" width={18} />}
                        onClick={openPromoPriceDialog}
                      >
                        Set promo prices
                        {selectedPromoCountries.length ? ` (${selectedPromoCountries.length})` : ''}
                      </Button>
                      <TextField
                        size="small"
                        fullWidth
                        type="number"
                        label="User limit"
                        value={promoForm.maxRedemptions}
                        onChange={(event) =>
                          setPromoForm((prev) => ({ ...prev, maxRedemptions: event.target.value }))
                        }
                        helperText="Max users who can use this code. Blank = unlimited."
                        inputProps={{ min: 1, step: 1 }}
                      />
                      <DatePicker
                        label="Valid Till"
                        format="DD/MM/YYYY"
                        value={promoForm.expiresAt}
                        onChange={(value) => setPromoForm((prev) => ({ ...prev, expiresAt: value }))}
                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={promoForm.isActive !== false}
                            onChange={(event) =>
                              setPromoForm((prev) => ({ ...prev, isActive: event.target.checked }))
                            }
                          />
                        }
                        label="Active"
                      />
                      <LoadingButton
                        variant="contained"
                        loading={savingPromo}
                        onClick={handleSavePromo}
                      >
                        {editingPromoId ? 'Update Promo Code' : 'Save Promo Code'}
                      </LoadingButton>
                      <Button color="inherit" onClick={closePromoPanel}>
                        Cancel
                      </Button>
                    </Stack>
                  </Card>
                </Box>
              </Grid>
            ) : null}
          </Grid>
          ) : null}

          {tabs.value === 'countries' ? (
          <Grid container spacing={2.5} alignItems="flex-start">
            <Grid item xs={12} lg={showCountryPanel ? 8 : 12}>
              <Card sx={{ p: 2.5 }}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={1.5}
                  alignItems={{ md: 'center' }}
                  justifyContent="space-between"
                  sx={{ mb: 2 }}
                >
                  <Typography variant="h6">Country Pricing List</Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: 1, md: 'auto' } }}>
                    <TextField
                      size="small"
                      placeholder="Search Asian country..."
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Iconify icon="eva:search-fill" width={18} />
                          </InputAdornment>
                        ),
                        endAdornment: search ? (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              edge="end"
                              aria-label="Clear search"
                              onClick={() => setSearch('')}
                            >
                              <Iconify icon="mingcute:close-line" width={16} />
                            </IconButton>
                          </InputAdornment>
                        ) : null,
                      }}
                      sx={{ minWidth: { sm: 220 } }}
                    />
                    <Button
                      variant="outlined"
                      color="inherit"
                      startIcon={<Iconify icon="solar:export-bold" width={18} />}
                      onClick={handleExport}
                    >
                      Export
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<Iconify icon="mingcute:add-line" width={18} />}
                      onClick={handleAddCountry}
                    >
                      Add Country
                    </Button>
                  </Stack>
                </Stack>

                <TableContainer sx={{ overflow: 'auto' }}>
                  <Table
                    size="small"
                    stickyHeader
                    sx={{
                      '& .MuiTableCell-root': {
                        py: 0.75,
                        whiteSpace: 'nowrap',
                      },
                    }}
                  >
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>Country</TableCell>
                        <TableCell>Currency</TableCell>
                        <TableCell align="right">Base Price</TableCell>
                        <TableCell>Discount / Special Price</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedRows.map((row, index) => {
                        const signupLink = row.promoCode
                          ? buildFullReferralLink(websiteBaseUrl, row.promoCode, referralLinkPath)
                          : '';
                        return (
                        <TableRow
                          key={row.code}
                          hover
                          selected={showCountryPanel && editingCode === row.code}
                          sx={{
                            opacity: row.active ? 1 : 0.55,
                          }}
                        >
                          <TableCell>{table.page * table.rowsPerPage + index + 1}</TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <CountryFlag code={row.code} />
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {row.name}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>{row.currency}</TableCell>
                          <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                            {formatMoney(row.basePrice)}
                          </TableCell>
                          <TableCell>
                            {row.discountPrice ? (
                              <Stack direction="row" spacing={0.75} alignItems="center">
                                <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                                  {formatMoney(row.discountPrice)}
                                </Typography>
                                {row.promoCode ? (
                                    <>
                                      <Chip
                                        size="small"
                                        color="success"
                                        label={row.promoCode}
                                        onClick={() => {
                                          const voucher = promoRows.find(
                                            (item) =>
                                              String(item.code || '').toUpperCase() === String(row.promoCode).toUpperCase(),
                                          );
                                          fillPromoForm(voucher || { code: row.promoCode, isActive: true });
                                        }}
                                        sx={{ height: 22, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}
                                      />
                                      <Tooltip title={signupLink || 'Copy signup link'}>
                                        <IconButton
                                          size="small"
                                          onClick={() => handleCopySignupLink(row.promoCode)}
                                        >
                                          <Iconify icon="solar:copy-bold" width={16} />
                                        </IconButton>
                                      </Tooltip>
                                    </>
                                  ) : null}
                              </Stack>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell>
                            <Switch
                              size="small"
                              checked={row.active !== false}
                              onChange={() => handleToggleActive(row)}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <IconButton color="default" onClick={() => fillCountryForm(row)}>
                              <Iconify icon="solar:pen-bold" />
                            </IconButton>
                            <IconButton color="error" onClick={() => handleDeleteCountry(row)}>
                              <Iconify icon="solar:trash-bin-trash-bold" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                        );
                      })}
                      {!filteredRows.length ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center">
                            <Typography variant="body2" color="text.secondary">
                              No countries found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePaginationCustom
                  page={table.page}
                  count={filteredRows.length}
                  rowsPerPage={table.rowsPerPage}
                  onPageChange={table.onChangePage}
                  onRowsPerPageChange={table.onChangeRowsPerPage}
                  rowsPerPageOptions={[5, 10, 25, 50]}
                />
              </Card>
            </Grid>

            {showCountryPanel ? (
            <Grid item xs={12} lg={4}>
              <Box ref={countryFormRef}>
                <Card sx={{ p: 2.5 }}>
                  <Typography variant="h6" sx={{ mb: 0.5 }}>
                    {countryForm.basePrice ? 'Edit Country Pricing' : 'Add Country Pricing'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Editing {selectedCountry.name}. Save to update the list.
                  </Typography>
                  <Stack spacing={1.75}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Country</InputLabel>
                      <Select
                        label="Country"
                        value={countryForm.code}
                        MenuProps={{ PaperProps: { sx: { maxHeight: 360 } } }}
                        onChange={(event) => {
                          const next = rows.find((row) => row.code === event.target.value);
                          if (next) fillCountryForm(next, { scroll: false });
                          else setCountryForm((prev) => ({ ...prev, code: event.target.value }));
                        }}
                      >
                        {COUNTRY_CATALOG.map((row) => (
                          <MenuItem key={row.code} value={row.code}>
                            {row.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      size="small"
                      label="Currency"
                      value={selectedCountry.currency}
                      InputProps={{ readOnly: true }}
                    />
                    <TextField
                      size="small"
                      type="number"
                      label="Base Price"
                      placeholder="Enter amount in selected currency"
                      value={countryForm.basePrice}
                      onChange={(event) =>
                        setCountryForm((prev) => ({ ...prev, basePrice: event.target.value }))
                      }
                      inputProps={{ min: 0, step: '1' }}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={countryForm.active !== false}
                          onChange={(event) =>
                            setCountryForm((prev) => ({ ...prev, active: event.target.checked }))
                          }
                        />
                      }
                      label="Status (Active)"
                    />
                    <LoadingButton
                      variant="contained"
                      loading={savingCountry}
                      onClick={handleSaveCountry}
                    >
                      Save Country Pricing
                    </LoadingButton>
                    <Button color="inherit" onClick={closeCountryPanel}>
                      Cancel
                    </Button>
                  </Stack>
                </Card>
              </Box>
            </Grid>
            ) : null}
          </Grid>
          ) : null}
        </Stack>
      )}

      <Dialog
        fullWidth
        fullScreen={isMobilePromoDialog}
        maxWidth="lg"
        open={promoPriceDialogOpen}
        onClose={() => setPromoPriceDialogOpen(false)}
        PaperProps={{
          sx: {
            m: { xs: 0, sm: 2 },
            maxHeight: { sm: '90vh' },
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <DialogTitle
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6">Promo prices by country</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Default SGD price: <strong>{formatMoney(defaultSgdAmount)}</strong>
              {promoForm.code ? ` · ${promoForm.code}` : ''}
            </Typography>
          </Box>
          <IconButton
            aria-label="Close"
            onClick={() => setPromoPriceDialogOpen(false)}
            sx={{ mt: -0.5, mr: -1 }}
          >
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </DialogTitle>
        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            pt: 0.5,
            pb: 2,
            flexShrink: 0,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Stack spacing={1.25}>
            <TextField
              size="small"
              fullWidth
              label="Search"
              value={promoDialogSearch}
              onChange={(event) => setPromoDialogSearch(event.target.value)}
              placeholder="Country, code or currency"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" width={18} />
                  </InputAdornment>
                ),
                endAdornment: promoDialogSearch ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      edge="end"
                      aria-label="Clear search"
                      onClick={() => setPromoDialogSearch('')}
                    >
                      <Iconify icon="mingcute:close-line" width={16} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
              inputProps={{
                style: {
                  color: 'inherit',
                  WebkitTextFillColor: 'inherit',
                  opacity: 1,
                },
              }}
            />
            <Autocomplete
              multiple
              fullWidth
              autoHighlight
              disableCloseOnSelect
              options={unselectedPromoCountries}
              value={[]}
              getOptionLabel={(option) => (option?.name ? `${option.name} (${option.currency})` : '')}
              isOptionEqualToValue={(option, value) => option.code === value.code}
              noOptionsText="All countries are already selected"
              onChange={(_, selected) => {
                const codes = (selected || []).map((row) => row.code).filter(Boolean);
                if (!codes.length) return;
                handlePromoCountriesChange([...(promoForm.countryCodes || []), ...codes]);
              }}
              renderTags={() => null}
              renderOption={(props, option, { selected }) => {
                const { key, ...optionProps } = props;
                return (
                  <li key={key || option.code} {...optionProps}>
                    <Checkbox size="small" checked={selected} sx={{ mr: 1, p: 0.5 }} />
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CountryFlag code={option.code} />
                      <span>{option.name} ({option.currency})</span>
                    </Stack>
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Add country"
                  placeholder="Select a country that is not added yet"
                />
              )}
            />
            <FormControlLabel
              sx={{ ml: 0, mr: 0 }}
              control={
                <Checkbox
                  size="small"
                  checked={allPromoCountriesSelected}
                  indeterminate={
                    selectedPromoCountries.length > 0 && !allPromoCountriesSelected
                  }
                  onChange={(event) => toggleAllPromoDialogCountries(event.target.checked)}
                />
              }
              label={
                <Typography variant="body2">
                  Select all
                  <Typography component="span" variant="body2" color="text.secondary">
                    {` · ${filteredPromoDialogCountries.length} of ${selectedPromoCountries.length} countries`}
                  </Typography>
                </Typography>
              }
            />
          </Stack>
        </Box>
        <DialogContent
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            flex: 1,
            overflow: 'auto',
          }}
        >
          {!filteredPromoDialogCountries.length ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              {promoDialogSearch.trim()
                ? 'No countries match your search'
                : 'Select all or add a country to set promo prices'}
            </Typography>
          ) : (
            <Grid container spacing={1.5}>
            {filteredPromoDialogCountries.map((country) => {
              const row = rows.find((item) => item.code === country.code) || country;
              const hasCountryPrice = toAmount(row.basePrice) != null;
              const converted = convertSgdAmount(defaultSgdAmount, country.currency, fxRates);
              const displayAmount = hasCountryPrice ? toAmount(row.basePrice) : converted;
              const displaySource = hasCountryPrice ? 'Set' : converted != null ? 'Converted' : '—';
              const countryPriceLabel = displayAmount != null
                ? `${country.currency} ${formatMoney(displayAmount)}`
                : loadingFx
                  ? 'Loading…'
                  : '—';
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={country.code}>
                <Card
                  variant="outlined"
                  sx={{ p: { xs: 1.75, sm: 2 }, borderRadius: 1.5, height: 1 }}
                >
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ minHeight: 32 }}>
                      <Checkbox
                        size="small"
                        checked
                        onChange={(event) => togglePromoDialogCountry(country.code, event.target.checked)}
                        sx={{ p: 0.5, flexShrink: 0 }}
                      />
                      <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                        <CountryFlag code={country.code} />
                      </Box>
                      <Typography variant="subtitle2" noWrap sx={{ flex: 1, minWidth: 0 }}>
                        {country.name} ({country.currency})
                      </Typography>
                      {displayAmount != null ? (
                        <Chip
                          size="small"
                          color={hasCountryPrice ? 'success' : 'default'}
                          label={displaySource}
                          sx={{ height: 22, fontSize: 11, flexShrink: 0 }}
                        />
                      ) : null}
                    </Stack>

                    <Grid container spacing={1.25}>
                      <Grid item xs={6} sm={4}>
                        <Typography variant="caption" color="text.secondary">
                          Default (SGD)
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {formatMoney(defaultSgdAmount)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={8}>
                        <Typography variant="caption" color="text.secondary">
                          Country / Converted
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {countryPriceLabel}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          size="small"
                          fullWidth
                          type="number"
                          label="Promo price"
                          value={promoForm.promoPrices?.[country.code] ?? ''}
                          onChange={(event) =>
                            setPromoForm((prev) => ({
                              ...prev,
                              promoPrices: {
                                ...prev.promoPrices,
                                [country.code]: event.target.value,
                              },
                            }))
                          }
                          placeholder="Enter promo price"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">{country.currency}</InputAdornment>
                            ),
                          }}
                          inputProps={{ min: 0, step: '1' }}
                        />
                      </Grid>
                    </Grid>
                  </Stack>
                </Card>
                </Grid>
              );
            })}
            </Grid>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            gap: 1,
            flexDirection: { xs: 'column-reverse', sm: 'row' },
            '& > :not(:first-of-type)': { ml: { xs: 0, sm: 1 } },
          }}
        >
          <Button
            fullWidth={isMobilePromoDialog}
            color="inherit"
            onClick={() => setPromoPriceDialogOpen(false)}
          >
            Close
          </Button>
          <LoadingButton
            fullWidth={isMobilePromoDialog}
            variant="contained"
            loading={savingPromo}
            onClick={handleSavePromo}
          >
            Save promo prices
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
}

export function IntlPromoPricingView() {
  return (
    <DashboardContent>
      <CountryPricingManagementPanel
        title="International Pricing Management"
        subtitle="Manage country-wise pricing, currency and discount settings for the international site."
        voucherSite="international"
        fetchSettings={() => intlPaymentAdminService.getMembershipSettings()}
        saveSettings={async (countryPricing, settings) =>
          intlPaymentAdminService.updateMembershipSettings({
            baseAmountSgd: Number(settings?.baseAmountSgd) || 365,
            studentAmountSgd: Number(settings?.studentAmountSgd) || 150,
            voucherDiscountAmountSgd: Number(settings?.voucherDiscountAmountSgd) || 100,
            countryPricing,
            referralLinkPath: INTL_REFERRAL_PATH,
          })
        }
      />
    </DashboardContent>
  );
}
