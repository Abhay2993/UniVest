/**
 * Closing-soon alerts for watched offerings.
 *
 * Local scheduled notifications only: "closes in 48h" reminders are computed
 * on-device from the offering's close date when the user watches it.
 * Milestone-completion and new-deal-from-followed-university alerts are
 * server-side pushes (see Notification Service in docs/ARCHITECTURE.md) and
 * arrive through the same channel once the backend is live.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Startup } from '../types';

const CHANNEL_ID = 'offerings';
const CLOSING_ALERT_LEAD_DAYS = 2;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let channelReady = false;

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android' || channelReady) return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Offering alerts',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 150],
  });
  channelReady = true;
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}

/**
 * Schedules the "closing soon" reminder for a watched offering and returns
 * the notification id (null when permission is denied or scheduling fails —
 * the watchlist itself still works without alerts).
 */
export async function scheduleClosingSoonAlert(startup: Startup): Promise<string | null> {
  try {
    if (!(await requestNotificationPermission())) return null;
    await ensureAndroidChannel();

    // Fire 48h before close; offerings already inside that window get a
    // near-immediate reminder so the user still sees the deadline.
    const seconds = Math.max((startup.daysLeft - CLOSING_ALERT_LEAD_DAYS) * 86_400, 60);
    const body =
      startup.daysLeft > CLOSING_ALERT_LEAD_DAYS
        ? `The ${startup.name} offering closes in ${CLOSING_ALERT_LEAD_DAYS} days. Review your allocation before the round closes.`
        : `The ${startup.name} offering closes in ${startup.daysLeft} day${startup.daysLeft === 1 ? '' : 's'}. Review your allocation before the round closes.`;

    return await Notifications.scheduleNotificationAsync({
      content: { title: `${startup.name} — closing soon`, body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        channelId: CHANNEL_ID,
      },
    });
  } catch {
    return null;
  }
}

export async function cancelScheduledAlert(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Already delivered or cleared — nothing to cancel.
  }
}
