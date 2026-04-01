/**
 * Format view count to shortened format
 * Examples: 2000 -> 2k, 2100 -> 2.1k, 2100000 -> 2.1m, 2100000000 -> 2.1b
 */
export function formatViewCount(count) {
  if (!count && count !== 0) return '0';
  
  const num = Number(count);
  if (Number.isNaN(num)) return '0';
  
  if (num < 1000) {
    return num.toString();
  }
  
  if (num < 1000000) {
    // Thousands (k)
    const thousands = num / 1000;
    if (thousands % 1 === 0) {
      return `${thousands}k`;
    }
    return `${thousands.toFixed(1)}k`;
  }
  
  if (num < 1000000000) {
    // Millions (m)
    const millions = num / 1000000;
    if (millions % 1 === 0) {
      return `${millions}m`;
    }
    return `${millions.toFixed(1)}m`;
  }
  
  // Billions (b)
  const billions = num / 1000000000;
  if (billions % 1 === 0) {
    return `${billions}b`;
  }
  return `${billions.toFixed(1)}b`;
}
