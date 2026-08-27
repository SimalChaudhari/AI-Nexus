import { useCallback, useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableBody from '@mui/material/TableBody';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { useDebounce } from 'src/hooks/use-debounce';
import { useSetState } from 'src/hooks/use-set-state';

import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  emptyRows,
  TableNoData,
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
  TableLoadingOverlay,
} from 'src/components/table';
import { userService } from 'src/services/user.service';

import { CorporateMemberCompanyRow } from '../corporate-member-company-row';
import { CorporateMemberTableToolbar } from '../corporate-member-table-toolbar';
import { CorporateMemberExportDialog } from '../corporate-member-export-dialog';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'company', label: 'Company' },
  { id: 'companyCode', label: 'Company Code', width: 160 },
  { id: 'hrContacts', label: 'HR Contacts', width: 240 },
  { id: 'status', label: 'Status', width: 120 },
  { id: 'createdAt', label: 'Registered', width: 140 },
  { id: '', width: 64 },
];

const PAGE_SIZE = 100;

// ----------------------------------------------------------------------

function memberDisplayName(member) {
  return member.name || `${member.firstname || ''} ${member.lastname || ''}`.trim() || '';
}

function companyNameOf(member) {
  const name = String(member.company || '').trim();
  if (name && name !== '-') return name;
  return '';
}

function groupKeyOf(member) {
  const code = String(member.companyCode || '').trim().toLowerCase();
  if (code) return `code:${code}`;
  const name = companyNameOf(member).toLowerCase();
  if (name) return `name:${name}`;
  return `member:${member.id}`;
}

function groupCorporateMembers(members) {
  const buckets = new Map();

  members.forEach((member) => {
    const key = groupKeyOf(member);
    const existing = buckets.get(key);

    const explicitName = companyNameOf(member);
    const code = String(member.companyCode || '').trim();

    if (!existing) {
      buckets.set(key, {
        id: key,
        companyName: explicitName || code || memberDisplayName(member) || 'Unnamed company',
        companyCode: code,
        members: [member],
        hasExplicitName: Boolean(explicitName),
      });
      return;
    }

    existing.members.push(member);

    if (!existing.hasExplicitName && explicitName) {
      existing.companyName = explicitName;
      existing.hasExplicitName = true;
    }

    if (!existing.companyCode && code) {
      existing.companyCode = code;
    }
  });

  return [...buckets.values()]
    .map((bucket) => {
      const sortedMembers = [...bucket.members].sort((a, b) =>
        memberDisplayName(a).localeCompare(memberDisplayName(b))
      );
      const timestamps = sortedMembers
        .map((member) => (member.createdAt ? new Date(member.createdAt).getTime() : NaN))
        .filter((value) => Number.isFinite(value));
      const statuses = [...new Set(sortedMembers.map((member) => member.status || 'Active'))];

      return {
        ...bucket,
        members: sortedMembers,
        hrCount: sortedMembers.length,
        status: statuses.length === 1 ? statuses[0] : 'Mixed',
        createdAt: timestamps.length ? new Date(Math.min(...timestamps)).toISOString() : null,
      };
    })
    .sort((a, b) => a.companyName.localeCompare(b.companyName));
}

function groupMatchesSearch(group, query) {
  const q = query.trim().toLowerCase();
  if (!q) return { match: true, expandForHr: false };

  const companyHit =
    group.companyName.toLowerCase().includes(q) || group.companyCode.toLowerCase().includes(q);
  const hrHit = group.members.some((member) => {
    const haystack = [memberDisplayName(member), member.email, member.username]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });

  return { match: companyHit || hrHit, expandForHr: hrHit && !companyHit };
}

async function fetchAllCorporateMembers() {
  const all = [];
  let page = 1;
  let totalItems = Infinity;

  while (all.length < totalItems) {
    const result = await userService.getAllUsers({
      page,
      limit: PAGE_SIZE,
      role: 'Corporate',
    });

    const rows = Array.isArray(result) ? result : result?.data || [];
    totalItems = Array.isArray(result)
      ? rows.length
      : Number(result?.pagination?.totalItems) || all.length + rows.length;

    all.push(...rows);

    if (!rows.length || rows.length < PAGE_SIZE) break;
    page += 1;
  }

  return all;
}

// ----------------------------------------------------------------------

export function CorporateMemberListView() {
  const router = useRouter();
  const table = useTable({ defaultCurrentPage: 0, defaultRowsPerPage: 10 });
  const filters = useSetState({ name: '' });

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const debouncedSearch = useDebounce(filters.state.name, 400);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchAllCorporateMembers();
      setMembers(rows);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || 'Failed to load corporate members'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    table.onResetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const groupedCompanies = useMemo(() => groupCorporateMembers(members), [members]);

  const filteredCompanies = useMemo(
    () =>
      groupedCompanies
        .map((group) => ({ group, ...groupMatchesSearch(group, debouncedSearch) }))
        .filter((item) => item.match),
    [debouncedSearch, groupedCompanies]
  );

  const pageCompanies = useMemo(() => {
    const start = table.page * table.rowsPerPage;
    return filteredCompanies.slice(start, start + table.rowsPerPage);
  }, [filteredCompanies, table.page, table.rowsPerPage]);

  const notFound = !loading && !filteredCompanies.length;
  const denseHeight = table.dense ? 56 : 76;
  const hrTotal = groupedCompanies.reduce((sum, group) => sum + group.hrCount, 0);

  const handleViewRow = useCallback(
    (id) => {
      router.push(paths.admin.corporateMember.details(id));
    },
    [router]
  );

  const handleEditRow = useCallback(
    (id) => {
      router.push(paths.admin.corporateMember.edit(id));
    },
    [router]
  );

  const handleDeleteRow = useCallback(
    async (id) => {
      try {
        await userService.deleteUser(id);
        toast.success('Delete success!');
        await loadMembers();
      } catch (err) {
        toast.error(
          err?.response?.data?.message || err?.message || 'Failed to delete corporate member'
        );
      }
    },
    [loadMembers]
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Companies"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Corporate Members', href: paths.admin.corporateMember.list },
          { name: 'Companies' },
        ]}
        action={
          <Button
            variant="contained"
            color="primary"
            startIcon={<Iconify icon="solar:download-bold" width={18} />}
            onClick={() => setExportOpen(true)}
            sx={{ fontWeight: 700 }}
          >
            Export HR users
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        <CorporateMemberTableToolbar filters={filters} onResetPage={table.onResetPage} />

        <Stack direction="row" spacing={1} sx={{ px: 2.5, pb: 2 }}>
          <Label variant="soft" color="default">
            {groupedCompanies.length} {groupedCompanies.length === 1 ? 'company' : 'companies'}
          </Label>
          <Label variant="soft" color="info">
            {hrTotal} {hrTotal === 1 ? 'HR contact' : 'HR contacts'}
          </Label>
        </Stack>

        <Box sx={{ position: 'relative' }}>
          {loading ? <TableLoadingOverlay /> : null}

          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
              <TableHeadCustom headLabel={TABLE_HEAD} rowCount={pageCompanies.length} />

              <TableBody>
                {pageCompanies.map(({ group, expandForHr }) => (
                  <CorporateMemberCompanyRow
                    key={`${group.id}-${debouncedSearch}-${expandForHr}`}
                    company={group}
                    defaultExpanded={expandForHr || group.hrCount > 1}
                    onViewRow={handleViewRow}
                    onEditRow={handleEditRow}
                    onDeleteRow={handleDeleteRow}
                  />
                ))}

                <TableEmptyRows
                  height={denseHeight}
                  emptyRows={emptyRows(table.page, table.rowsPerPage, filteredCompanies.length)}
                />

                <TableNoData notFound={notFound} />
              </TableBody>
            </Table>
          </Scrollbar>
        </Box>

        <TablePaginationCustom
          page={table.page}
          dense={table.dense}
          count={filteredCompanies.length}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onChangeDense={table.onChangeDense}
          onRowsPerPageChange={table.onChangeRowsPerPage}
        />
      </Card>

      <CorporateMemberExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        search={debouncedSearch.trim() || undefined}
      />
    </DashboardContent>
  );
}
