import axios from 'src/utils/axios';

/**
 * Fetch dashboard stats (admin). Returns totalUsers, totalCourses, totalOrders, totalRevenue, completedOrders.
 */
export async function getDashboardStats() {
  const response = await axios.get('/dashboard/stats');
  return response.data;
}

/**
 * Weekly Metric No. 1 — current totals vs last week for enrolled users, badge earners, champions.
 */
export async function getDashboardOverallGrowth() {
  const response = await axios.get('/dashboard/overall-growth');
  return response.data;
}

/**
 * Weekly Metric No. 1 — launch-to-date week-by-week series plus current totals.
 */
export async function getDashboardOverallGrowthWeekly() {
  const response = await axios.get('/dashboard/overall-growth/weekly');
  return response.data;
}

/**
 * Weekly Metric No. 1 — download user-level CSV (enrolled / badge / champion).
 */
export async function downloadOverallGrowthUsersCsv({
  metric = 'all',
  fields = [],
  from,
  to,
} = {}) {
  const response = await axios.get('/dashboard/overall-growth/users-csv', {
    params: {
      metric,
      fields: Array.isArray(fields) ? fields.join(',') : fields,
      from: from || undefined,
      to: to || undefined,
    },
    responseType: 'blob',
  });
  const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const rangePart = [from, to].filter(Boolean).join('_to_') || 'all';
  link.download = `weekly-report-users-${metric}-${rangePart}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Weekly Metric No. 2 — enrolled companies with badge and champion percentages.
 */
export async function getDashboardCompanyGrowth() {
  const response = await axios.get('/dashboard/company-growth');
  return response.data;
}

/**
 * Fetch recent orders for dashboard (admin). Returns array of order items.
 */
export async function getDashboardRecentOrders() {
  const response = await axios.get('/dashboard/recent-orders');
  return Array.isArray(response.data) ? response.data : response.data?.data ?? [];
}

/**
 * Fetch top rated courses for dashboard (admin). Returns array of course items with avgRating and ratingCount.
 */
export async function getDashboardTopRatedCourses() {
  const response = await axios.get('/dashboard/top-rated-courses');
  return Array.isArray(response.data) ? response.data : response.data?.data ?? [];
}
