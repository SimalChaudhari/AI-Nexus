import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import CardHeader from '@mui/material/CardHeader';

import { fCurrency } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { TableHeadCustom } from 'src/components/table';

// ----------------------------------------------------------------------

export function AppNewInvoice({ title, subheader, tableData = [], headLabel, onViewAll, sx, ...other }) {
  const columnCount = Array.isArray(headLabel) && headLabel.length ? headLabel.length : 5;

  return (
    <Card
      {...other}
      sx={[
        { height: 1, display: 'flex', flexDirection: 'column' },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <CardHeader title={title} subheader={subheader} sx={{ mb: 3 }} />

      <Scrollbar sx={{ minHeight: 0, flex: 1 }}>
        <Table sx={{ minWidth: 680 }}>
          <TableHeadCustom headLabel={headLabel} />

          <TableBody>
            {tableData.length ? (
              tableData.map((row) => <RowItem key={row.id} row={row} />)
            ) : (
              <TableRow>
                <TableCell colSpan={columnCount} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  No order found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Scrollbar>

      <Divider sx={{ borderStyle: 'dashed' }} />

      <Box sx={{ p: 2, textAlign: 'right' }}>
        <Button
          size="small"
          color="inherit"
          endIcon={<Iconify icon="eva:arrow-ios-forward-fill" width={18} sx={{ ml: -0.5 }} />}
          onClick={onViewAll}
        >
          View all
        </Button>
      </Box>
    </Card>
  );
}

function RowItem({ row }) {
  return (
    <TableRow>
      <TableCell>{row.invoiceNumber || 'Order ID not found'}</TableCell>

      <TableCell>{row.category}</TableCell>

      <TableCell>{fCurrency(row.price)}</TableCell>

                      <TableCell>
                        {row.date ? new Date(row.date).toLocaleDateString() : '—'}
                      </TableCell>

                      <TableCell>
                        <Label
                          variant="soft"
                          color={
                            String(row.status).toLowerCase() === 'completed'
                              ? 'success'
                              : String(row.status).toLowerCase() === 'pending'
                                ? 'warning'
                                : String(row.status).toLowerCase() === 'failed'
                                  ? 'error'
                                  : 'default'
                          }
                        >
                          {row.status}
                        </Label>
                      </TableCell>
    </TableRow>
  );
}
