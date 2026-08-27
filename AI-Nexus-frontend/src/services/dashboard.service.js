import axios from 'src/utils/axios';

/**
 * Fetch dashboard stats (admin). Returns totalUsers, totalCourses, totalOrders, totalRevenue, completedOrders.
 */
export async function getDashboardStats() {
  const response = await axios.get('/dashboard/stats');
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
