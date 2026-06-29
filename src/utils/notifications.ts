import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getReminderCount, getReminderSound, getReminderWindow } from '@/data/repository';
import { reminderTimes } from '@/utils/reminderSchedule';
import { getStoredLang } from '@/i18n';
import { translate } from '@/i18n';

// Local reminder notifications: a configurable nudge to log spending. Purely
// local — no server, no push token. Frequency (every 6h / 12h / once a day) and
// the daily time are user-adjustable in Settings, and each reminder carries
// Yes/No action buttons.
//
// NOTE: expo-notifications is not fully supported inside Expo Go (SDK 53+).
// Scheduling and action buttons fire reliably in a dev/production build; in
// Expo Go these calls are no-ops. Everything is wrapped so it never crashes.

const REMINDER_TAG = 'flexbudget-log-reminder';
const CATEGORY_ID = 'reminder-actions';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Register the Yes/No action buttons (localized) for reminder notifications. */
async function registerActions(): Promise<void> {
  try {
    const lang = await getStoredLang();
    await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
      { identifier: 'YES', buttonTitle: translate(lang, 'notif.yes'), options: { opensAppToForeground: true } },
      { identifier: 'NO', buttonTitle: translate(lang, 'notif.no'), options: { opensAppToForeground: false } },
    ]);
  } catch {
    // ignore — actions just won't show
  }
}

/** Ask for permission. Returns true if granted. */
export async function requestReminderPermission(): Promise<boolean> {
  try {
    const settings = await Notifications.getPermissionsAsync();
    let granted = settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted;
    }
    if (granted && Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Spending reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    return granted;
  } catch {
    return false;
  }
}

/** Cancel existing reminders, then schedule `count` daily ones across the window. */
export async function scheduleReminders(): Promise<void> {
  try {
    await cancelReminders();
    await registerActions();
    const [lang, count, sound, win] = await Promise.all([
      getStoredLang(), getReminderCount(), getReminderSound(), getReminderWindow(),
    ]);
    const times = reminderTimes(win.startH, win.startM, win.endH, win.endM, count);
    const body = translate(lang, 'notif.reminderBody');
    for (let i = 0; i < times.length; i++) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${REMINDER_TAG}-${i}`,
        content: { title: 'FlexBudget', body, categoryIdentifier: CATEGORY_ID, sound: sound ? 'default' : undefined },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: times[i].hour, minute: times[i].minute, channelId: 'reminders' },
      });
    }
  } catch {
    // no-op in Expo Go / when unsupported
  }
}

export async function cancelReminders(): Promise<void> {
  try {
    // Remove all of our scheduled reminders (the old single tag + the new N).
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((s) => typeof s.identifier === 'string' && s.identifier.startsWith(REMINDER_TAG))
        .map((s) => Notifications.cancelScheduledNotificationAsync(s.identifier)),
    );
  } catch {
    // ignore if not scheduled
  }
}

/** Fire a one-off notification a couple seconds out — to test that it works. */
export async function sendTestReminder(): Promise<boolean> {
  try {
    const granted = await requestReminderPermission();
    if (!granted) return false;
    await registerActions();
    const lang = await getStoredLang();
    await Notifications.scheduleNotificationAsync({
      content: { title: 'FlexBudget', body: translate(lang, 'notif.reminderBody'), categoryIdentifier: CATEGORY_ID },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2, channelId: 'reminders' },
    });
    return true;
  } catch {
    return false;
  }
}

/** Turn reminders on (request permission + schedule) or off. */
export async function applyReminderSetting(on: boolean): Promise<boolean> {
  if (!on) {
    await cancelReminders();
    return false;
  }
  const granted = await requestReminderPermission();
  if (!granted) return false;
  await scheduleReminders();
  return true;
}
