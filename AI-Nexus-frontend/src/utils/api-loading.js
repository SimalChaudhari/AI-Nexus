/**
 * Global API loading tracker for admin dashboard.
 * Axios interceptors call increment() on request start and decrement() on response/error.
 * Dashboard layout subscribes and shows an overlay when pendingCount > 0.
 */

let pendingCount = 0;
const listeners = new Set();

function notify() {
  listeners.forEach((cb) => {
    try {
      cb(pendingCount);
    } catch (e) {
      // ignore
    }
  });
}

export const apiLoading = {
  increment() {
    pendingCount += 1;
    notify();
  },
  decrement() {
    if (pendingCount > 0) {
      pendingCount -= 1;
      notify();
    }
  },
  getPendingCount() {
    return pendingCount;
  },
  subscribe(callback) {
    listeners.add(callback);
    callback(pendingCount);
    return () => listeners.delete(callback);
  },
};
