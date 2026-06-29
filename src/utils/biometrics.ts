import * as LocalAuthentication from 'expo-local-authentication';

// Device biometric (fingerprint / face) helpers for the app lock. All wrapped
// so they degrade gracefully where biometrics aren't available.

/** True if the device has biometric hardware AND the user has enrolled one. */
export async function canUseBiometrics(): Promise<boolean> {
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
  } catch {
    return false;
  }
}

/** Prompt for biometric auth. Returns true on success. */
export async function authenticateBiometric(prompt: string): Promise<boolean> {
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: prompt,
      disableDeviceFallback: false,
    });
    return res.success;
  } catch {
    return false;
  }
}
