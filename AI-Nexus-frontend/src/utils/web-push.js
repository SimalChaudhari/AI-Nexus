import { notificationService } from 'src/services/notification.service';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerPushServiceWorker() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  return registration;
}

/**
 * Request permission, register SW, and save push subscription for the logged-in user.
 */
export async function enableWebPushForUser() {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'unsupported' };
  }

  const vapid = await notificationService.getVapidPublicKey();
  if (!vapid?.enabled || !vapid?.publicKey) {
    return { ok: false, reason: 'vapid_disabled' };
  }

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') {
    return { ok: false, reason: 'denied' };
  }

  const registration = await registerPushServiceWorker();
  if (!registration) {
    return { ok: false, reason: 'sw_failed' };
  }

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid.publicKey),
    });
  }

  await notificationService.subscribePush(subscription.toJSON());
  return { ok: true };
}
