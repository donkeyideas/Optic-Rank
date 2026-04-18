import { Alert, Linking } from "react-native";

/**
 * Safely open a URL with error handling.
 * Shows an alert if the URL can't be opened.
 */
export async function openURL(url: string): Promise<void> {
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Cannot open link", "Your device cannot open this URL.");
    }
  } catch {
    Alert.alert("Error", "Something went wrong opening the link.");
  }
}
