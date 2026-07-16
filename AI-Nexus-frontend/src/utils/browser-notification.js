import { htmlToPlainText } from 'src/utils/html-plain-text';

const NOTIFIED_IDS_KEY = 'announcement-browser-notified-ids';
const MAX_TRACKED_IDS = 50;

function getNotifiedIds() {
  try {
    const raw = sessionStorage.getItem(NOTIFIED_IDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function markNotified(id) {
  if (!id) return;
  const ids = getNotifiedIds().filter((item) => item !== id);
  ids.unshift(id);
  sessionStorage.setItem(NOTIFIED_IDS_KEY, JSON.stringify(ids.slice(0, MAX_TRACKED_IDS)));
}

function wasNotified(id) {
  return getNotifiedIds().includes(id);
}

export function isBrowserNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function ensureBrowserNotificationPermission() {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/**
 * Show a desktop/browser notification for a new announcement.
 * Dedupes by announcement id within the current browser session.
 */
export function showAnnouncementBrowserNotification(announcement, options = {}) {
  if (!isBrowserNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  const id = announcement?.id || announcement?._id;
  if (!id || wasNotified(id)) return false;

  const title = String(announcement?.title || 'New announcement').trim() || 'New announcement';
  const plainBody = htmlToPlainText(announcement?.description || announcement?.content || '');
  const body =
    plainBody.length > 160 ? `${plainBody.slice(0, 157)}...` : plainBody || 'A new announcement was posted.';

  try {
    const notification = new Notification(title, {
      body,
      tag: `announcement-${id}`,
      renotify: true,
      icon: options.icon,
    });

    notification.onclick = () => {
      window.focus();
      if (options.onClickUrl) {
        window.location.href = options.onClickUrl;
      }
      notification.close();
    };

    markNotified(id);
    return true;
  } catch (error) {
    console.error('Failed to show browser notification:', error);
    return false;
  }
}
