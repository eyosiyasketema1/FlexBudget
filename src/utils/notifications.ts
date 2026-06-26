import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Local reminder notifications: a gentle nudge every 6 hours to log any
// spending you might have forgotten. Purely local — no server, no push token.
//
// NOTE: expo-notifications is not fully supported inside Expo Go (SDK 53+).
// Scheduling will be a no-op there; reminders fire reliably in a dev/production
// build. All calls are wrapped so they never crash the app in Expo Go.

const SIX_HOURS_SECONDS = 6 * 60 * 60;
const REMINDER_TAG = 'flexbudget-log-reminder';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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

/** Cancel any existing reminder, then schedule a repeating one every 6 hours. */
export async function scheduleReminders(): Promise<void> {
  try {
    await cancelReminders();
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_TAG,
      content: {
        title: 'FlexBudget',
        body: 'Spend anything? Take a few seconds to log it so your budget stays accurate.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: SIX_HOURS_SECONDS,
        repeats: true,
        channelId: 'reminders',
      },
    });
  } catch {
    // no-op in Expo Go / when unsupported
  }
}

export async function cancelReminders(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_TAG);
  } catch {
    // ignore if not scheduled
  }
}

/** Fire a one-off notification a couple seconds out — to test that it works. */
export async function sendTestReminder(): Promise<boolean> {
  try {
    const granted = await requestReminderPermission();
    if (!granted) return false;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'FlexBudget',
        body: 'Test reminder — notifications are working. Background the app to see this as a banner.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
        channelId: 'reminders',
      },
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
