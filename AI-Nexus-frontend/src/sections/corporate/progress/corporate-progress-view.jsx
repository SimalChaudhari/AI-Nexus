import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

import { LoadingScreen } from 'src/components/loading-screen';

import { CORP } from '../corporate-theme';
import { useCorporateLearners } from '../use-corporate-data';
import {
  CorpBtn,
  CorpCard,
  CorpPageHeader,
  CorpPill,
  CorpProgressBar,
  CorpTableHead,
  CorpTextBtn,
  corpTableSx,
} from '../corporate-ui';

// ----------------------------------------------------------------------

export function CorporateProgressView() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All statuses');
  const { data: allRows, loading, error } = useCorporateLearners();

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter((s) => {
      const matchesStatus = status === 'All statuses' || s.status === status;
      const matchesSearch =
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.role?.toLowerCase().includes(q) ||
        s.department?.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [allRows, search, status]);

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '14px',
      bgcolor: 'white',
      '& fieldset': { borderColor: CORP.line },
    },
    minWidth: { xs: '100%', sm: 220 },
  };

  const exportCsv = useMemo(
    () => () => {
      const header = [
        'Name',
        'Email',
        'Role',
        'Eligibility',
        'Status',
        'P1 hours',
        'P2 hours',
        'P3 hours',
        'Certificate',
        'Pending',
      ];
      const lines = rows.map((s) =>
        [
          s.name,
          s.email,
          s.role,
          s.eligibility,
          s.status,
          `${s.p1?.c ?? 0}/${s.p1?.t ?? 0}`,
          `${s.p2?.c ?? 0}/${s.p2?.t ?? 0}`,
          `${s.p3?.c ?? 0}/${s.p3?.t ?? 0}`,
          s.cert ? 'Yes' : 'No',
          s.pending,
        ]
          .map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`)
          .join(','),
      );
      const blob = new Blob([[header.join(','), ...lines].join('\n')], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'corporate-learner-progress.csv';
      a.click();
      URL.revokeObjectURL(url);
    },
    [rows],
  );

  if (loading && !allRows.length) return <LoadingScreen />;

  return (
    <Box>
      <CorpPageHeader
        title="Learner Progress"
        subtitle="Track completion by staff and by pillar."
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <CorpCard>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 1.5,
            alignItems: 'center',
            mb: 1.75,
            flexWrap: 'wrap',
          }}
        >
          <TextField
            size="small"
            placeholder="Search learner, department or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={fieldSx}
          />
          <TextField
            select
            size="small"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            sx={fieldSx}
          >
            {['All statuses', 'Completed', 'In Progress', 'At Risk'].map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </TextField>
          <CorpBtn variant="blue" onClick={exportCsv}>
            Export CSV
          </CorpBtn>
        </Box>

        <Box sx={{ overflow: 'auto' }}>
          <Box component="table" sx={corpTableSx(1320)}>
            <CorpTableHead
              columns={[
                'Learner',
                'Eligibility',
                'Pillar 1 Foundations',
                'Pillar 2 Specialisation',
                'Pillar 3 Leadership',
                'Completion status',
                'Pending item',
                'Actions',
                'Certificate',
              ]}
            />
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9}>No learners found.</td>
                </tr>
              ) : (
                rows.map((s) => (
                  <tr key={s.userId || s.email}>
                    <td>
                      <b>{s.name}</b>
                      <small>
                        {s.email}
                        <br />
                        {s.department} · {s.role}
                      </small>
                    </td>
                    <td>
                      {s.eligibility}
                      <small>Profession: {s.profession}</small>
                    </td>
                    <td>
                      <CorpProgressBar pillar={s.p1} textType="long" />
                      <small>
                        Quiz: {s.p1?.q ? 'Passed' : 'Pending'} · Assessment:{' '}
                        {s.p1?.a ? 'Passed' : 'Pending'}
                      </small>
                    </td>
                    <td>
                      <CorpProgressBar pillar={s.p2} textType="long" />
                      <small>Eligible specialisation: {s.p2?.e ? 'Completed' : 'Pending'}</small>
                    </td>
                    <td>
                      <CorpProgressBar pillar={s.p3} textType="long" />
                    </td>
                    <td>
                      <CorpPill status={s.status} />
                      <small>Last active: {s.lastActive}</small>
                    </td>
                    <td>
                      <Box sx={{ maxWidth: 300, lineHeight: 1.45 }}>{s.pending}</Box>
                    </td>
                    <td>
                      <CorpTextBtn>Nudge</CorpTextBtn>
                      <CorpTextBtn>View</CorpTextBtn>
                    </td>
                    <td>
                      {s.cert ? (
                        <>
                          <CorpTextBtn>Download Certificate</CorpTextBtn>
                          <small>Available for this learner</small>
                        </>
                      ) : (
                        <>
                          <CorpTextBtn disabled>Certificate not available yet</CorpTextBtn>
                          <small>{s.pending}</small>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Box>
        </Box>
      </CorpCard>
    </Box>
  );
}
