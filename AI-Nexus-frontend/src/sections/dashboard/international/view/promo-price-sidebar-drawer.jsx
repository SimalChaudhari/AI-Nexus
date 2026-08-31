import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Autocomplete from '@mui/material/Autocomplete';
import InputAdornment from '@mui/material/InputAdornment';
import FormControlLabel from '@mui/material/FormControlLabel';
import LoadingButton from '@mui/lab/LoadingButton';

import { Iconify } from 'src/components/iconify';

export function PromoPriceSidebarDrawer({
  open,
  onClose,
  onSave,
  saving,
  promoForm,
  setPromoForm,
  promoPriceSearch,
  onPromoPriceSearchChange,
  onClearPromoPriceSearch,
  defaultSgdAmount,
  defaultStudentSgdAmount,
  formatMoney,
  formatMoneyWithCurrency,
  convertSgdAmount,
  toAmount,
  rows,
  fxRates,
  loadingFx,
  isIntlSite,
  unselectedPromoCountries,
  selectedPromoCountries,
  filteredPromoPriceCountries,
  allPromoCountriesSelected,
  onPromoCountriesChange,
  onToggleAllCountries,
  onToggleCountry,
  CountryFlag,
}) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 520, md: 640 },
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 2,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6">Promo prices by country</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Default SGD price: <strong>{formatMoney(defaultSgdAmount)}</strong>
            {promoForm.code ? ` · ${promoForm.code}` : ''}
          </Typography>
        </Box>
        <IconButton aria-label="Close sidebar" onClick={onClose} sx={{ mt: -0.5, mr: -0.5 }}>
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </Box>

      <Box
        sx={{
          px: 2.5,
          py: 2,
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
            value={promoPriceSearch}
            onChange={(event) => onPromoPriceSearchChange(event.target.value)}
            placeholder="Country, code or currency"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" width={18} />
                </InputAdornment>
              ),
              endAdornment: promoPriceSearch ? (
                <InputAdornment position="end">
                  <IconButton size="small" edge="end" aria-label="Clear search" onClick={onClearPromoPriceSearch}>
                    <Iconify icon="mingcute:close-line" width={16} />
                  </IconButton>
                </InputAdornment>
              ) : null,
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
              onPromoCountriesChange([...(promoForm.countryCodes || []), ...codes]);
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
                indeterminate={selectedPromoCountries.length > 0 && !allPromoCountriesSelected}
                onChange={(event) => onToggleAllCountries(event.target.checked)}
              />
            }
            label={
              <Typography variant="body2">
                Select all
                <Typography component="span" variant="body2" color="text.secondary">
                  {` · ${filteredPromoPriceCountries.length} of ${selectedPromoCountries.length} countries`}
                </Typography>
              </Typography>
            }
          />
        </Stack>
      </Box>

      <Box sx={{ px: 2.5, py: 2, flex: 1, overflow: 'auto' }}>
        {!filteredPromoPriceCountries.length ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            {promoPriceSearch.trim()
              ? 'No countries match your search'
              : 'Select all or add a country to set promo prices'}
          </Typography>
        ) : (
          <Grid container spacing={1.5}>
            {filteredPromoPriceCountries.map((country) => {
              const row = rows.find((item) => item.code === country.code) || country;
              const plan = String(promoForm.membershipType || '').toLowerCase();
              const showFullPrice = !isIntlSite || plan !== 'student';
              const showStudentPrice = isIntlSite && plan !== 'full';
              const hasFullCountryPrice = toAmount(row.basePrice) != null;
              const hasStudentCountryPrice = toAmount(row.studentBasePrice) != null;
              const convertedFull = convertSgdAmount(defaultSgdAmount, country.currency, fxRates);
              const convertedStudent = convertSgdAmount(defaultStudentSgdAmount, country.currency, fxRates);
              const displayFull = hasFullCountryPrice ? toAmount(row.basePrice) : convertedFull;
              const displayStudent = hasStudentCountryPrice ? toAmount(row.studentBasePrice) : convertedStudent;
              const displayAmount = showStudentPrice && !showFullPrice ? displayStudent : displayFull;
              const hasCountryPrice = showStudentPrice && !showFullPrice ? hasStudentCountryPrice : hasFullCountryPrice;
              const converted = showStudentPrice && !showFullPrice ? convertedStudent : convertedFull;
              const displaySource = hasCountryPrice ? 'Set' : converted != null ? 'Converted' : '—';
              const countryPriceLabel = displayAmount != null
                ? formatMoneyWithCurrency(displayAmount, country.currency)
                : loadingFx
                  ? 'Loading…'
                  : '—';
              const defaultSgdLabel = showStudentPrice && !showFullPrice
                ? defaultStudentSgdAmount
                : defaultSgdAmount;

              return (
                <Grid item xs={12} sm={6} md={4} key={country.code}>
                  <Card variant="outlined" sx={{ p: { xs: 1.75, sm: 2 }, borderRadius: 1.5, height: 1 }}>
                    <Stack spacing={1.5}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ minHeight: 32 }}>
                        <Checkbox
                          size="small"
                          checked
                          onChange={(event) => onToggleCountry(country.code, event.target.checked)}
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
                            {formatMoneyWithCurrency(defaultSgdLabel, 'SGD')}
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
                        {showFullPrice ? (
                          <Grid item xs={12} sm={showStudentPrice ? 6 : 12}>
                            <TextField
                              size="small"
                              fullWidth
                              type="number"
                              label={isIntlSite ? 'Full / Role promo price' : 'Promo price'}
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
                        ) : null}
                        {showStudentPrice ? (
                          <Grid item xs={12} sm={showFullPrice ? 6 : 12}>
                            <TextField
                              size="small"
                              fullWidth
                              type="number"
                              label="Student promo price"
                              value={promoForm.studentPromoPrices?.[country.code] ?? ''}
                              onChange={(event) =>
                                setPromoForm((prev) => ({
                                  ...prev,
                                  studentPromoPrices: {
                                    ...prev.studentPromoPrices,
                                    [country.code]: event.target.value,
                                  },
                                }))
                              }
                              placeholder="Enter student promo price"
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">{country.currency}</InputAdornment>
                                ),
                              }}
                              inputProps={{ min: 0, step: '1' }}
                            />
                          </Grid>
                        ) : null}
                      </Grid>
                    </Stack>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>

      <Box
        sx={{
          px: 2.5,
          py: 2,
          gap: 1,
          display: 'flex',
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          justifyContent: 'flex-end',
          borderTop: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <Button color="inherit" onClick={onClose}>
          Close
        </Button>
        <LoadingButton variant="contained" loading={saving} onClick={onSave}>
          Save promo prices
        </LoadingButton>
      </Box>
    </Drawer>
  );
}
