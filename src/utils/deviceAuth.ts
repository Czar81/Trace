import * as LocalAuthentication from 'expo-local-authentication';

/** True when the device has a fingerprint/face enrolled or a PIN/pattern/password set. */
export const isDeviceAuthAvailable = async (): Promise<boolean> => {
  try {
    return (await LocalAuthentication.getEnrolledLevelAsync()) !== LocalAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
};

/** Prompts biometrics, falling back to the device PIN/pattern/password. */
export const authenticate = async (promptMessage: string, cancelLabel: string): Promise<boolean> => {
  try {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel });
    return result.success;
  } catch {
    return false;
  }
};
