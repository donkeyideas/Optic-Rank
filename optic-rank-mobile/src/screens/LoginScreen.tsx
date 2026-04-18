import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../navigation/AuthStack";
import Svg, { Path } from "react-native-svg";
import * as AppleAuthentication from "expo-apple-authentication";
import { useTheme } from "../theme/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { APP_CONFIG } from "../lib/config";
import { openURL } from "../lib/openURL";
import { fonts, fontSize } from "../theme/typography";
import { spacing } from "../theme/spacing";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

type LoginNavProp = NativeStackNavigationProp<AuthStackParamList, "Login">;

export default function LoginScreen() {
  const navigation = useNavigation<LoginNavProp>();
  const { colors } = useTheme();
  const { signIn, signInWithOAuth, signInWithApple, resetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [appleSignInAvailable, setAppleSignInAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === "ios") {
      AppleAuthentication.isAvailableAsync().then(setAppleSignInAvailable);
    }
  }, []);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (error: any) {
      Alert.alert(
        "Sign In Failed",
        error?.message || "An unexpected error occurred. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    try {
      await signInWithOAuth(provider);
    } catch (error: any) {
      Alert.alert(
        "OAuth Error",
        error?.message || "Could not sign in with " + provider + "."
      );
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await signInWithApple();
    } catch (error: any) {
      if (error?.code === "ERR_REQUEST_CANCELED") return;
      Alert.alert(
        "Apple Sign-In Failed",
        error?.message || "Could not sign in with Apple."
      );
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert(
        "Enter Your Email",
        "Please enter your email address above, then tap Forgot Password again."
      );
      return;
    }

    try {
      await resetPassword(email.trim());
      Alert.alert(
        "Check Your Email",
        "If an account exists for that email, we've sent password reset instructions."
      );
    } catch (error: any) {
      Alert.alert(
        "Reset Failed",
        error?.message || "Could not send reset email. Please try again."
      );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "bottom"]}>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        style={[styles.scrollView, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {/* Auth Header */}
        <View style={styles.header}>
          <View style={[styles.logoMark, { borderColor: colors.borderDark }]}>
            <Text style={[styles.logoLetter, { color: colors.ink }]}>O</Text>
          </View>
          <Text style={[styles.logoName, { color: colors.ink }]}>
            Optic Rank
          </Text>
          <Text style={[styles.tagline, { color: colors.inkMuted }]}>
            AI-Powered SEO Intelligence
          </Text>
        </View>

        {/* Auth Body */}
        <View style={styles.body}>
          <Input
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password"
          />

          {/* Remember me + Forgot password row */}
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.rememberRow}
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: colors.borderDark,
                    backgroundColor: rememberMe
                      ? colors.ink
                      : "transparent",
                  },
                ]}
              >
                {rememberMe && (
                  <Text style={[styles.checkmark, { color: colors.background }]}>
                    {"\u2713"}
                  </Text>
                )}
              </View>
              <Text style={[styles.rememberText, { color: colors.inkSecondary }]}>
                Remember me
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
              <Text style={[styles.forgotText, { color: colors.red }]}>
                Forgot password?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sign In Button */}
          <Button
            title={isLoading ? "Signing In..." : "Sign In"}
            onPress={handleSignIn}
            variant="primary"
            disabled={isLoading}
            style={styles.signInButton}
          />

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.inkMuted }]}>
              or continue with
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Apple Sign-In Button (iOS — shown first per Apple guidelines) */}
          {appleSignInAvailable && (
            <TouchableOpacity
              style={[
                styles.socialButton,
                {
                  backgroundColor: "#000000",
                  borderColor: "#000000",
                },
              ]}
              onPress={handleAppleSignIn}
              activeOpacity={0.7}
              accessibilityLabel="Sign in with Apple"
            >
              <View style={styles.socialIconWrap}>
                <Svg width={20} height={20} viewBox="0 0 24 24">
                  <Path
                    d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
                    fill="#FFFFFF"
                  />
                </Svg>
              </View>
              <Text style={[styles.socialButtonText, { color: "#FFFFFF" }]}>
                Sign in with Apple
              </Text>
            </TouchableOpacity>
          )}

          {/* Google Button */}
          <TouchableOpacity
            style={[
              styles.socialButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                marginTop: appleSignInAvailable ? spacing.sm : 0,
              },
            ]}
            onPress={() => handleOAuth("google")}
            activeOpacity={0.7}
            accessibilityLabel="Sign in with Google"
          >
            <View style={styles.socialIconWrap}>
              <Svg width={20} height={20} viewBox="0 0 48 48">
                <Path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" fill="#FFC107" />
                <Path d="M5.3 14.7l7.4 5.4C14.5 16.2 18.9 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 15.4 2 8.1 7.3 5.3 14.7z" fill="#FF3D00" />
                <Path d="M24 46c5.4 0 10.3-1.8 14.1-5l-6.5-5.5C29.6 37.1 27 38 24 38c-6 0-11.1-4-12.8-9.5l-7.3 5.6C6.9 41 14.9 46 24 46z" fill="#4CAF50" />
                <Path d="M44.5 20H24v8.5h11.8c-1 3.2-3 5.8-5.6 7.5l6.5 5.5c3.8-3.5 6.3-8.8 6.3-15.5 0-1.3-.2-2.7-.5-4V20z" fill="#1976D2" />
              </Svg>
            </View>
            <Text style={[styles.socialButtonText, { color: colors.ink }]}>
              Google
            </Text>
          </TouchableOpacity>

          {/* Terms & Privacy */}
          <Text style={[styles.termsText, { color: colors.inkMuted }]}>
            By signing in, you agree to our{" "}
            <Text
              style={[styles.termsLink, { color: colors.red }]}
              onPress={() => openURL(APP_CONFIG.TERMS_URL)}
            >
              Terms
            </Text>{" "}
            &{" "}
            <Text
              style={[styles.termsLink, { color: colors.red }]}
              onPress={() => openURL(APP_CONFIG.PRIVACY_URL)}
            >
              Privacy Policy
            </Text>
          </Text>
        </View>

        {/* Auth Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.inkSecondary }]}>
            Don't have an account?{" "}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("SignUp")}
            activeOpacity={0.7}
          >
            <Text style={[styles.footerLink, { color: colors.red }]}>
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Header
  header: {
    alignItems: "center",
    paddingTop: 70,
    paddingBottom: spacing.xxl,
  },
  logoMark: {
    width: 60,
    height: 60,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  logoLetter: {
    fontFamily: fonts.serif,
    fontSize: 32,
  },
  logoName: {
    fontFamily: fonts.serifExtraBold,
    fontSize: 20,
    marginTop: spacing.md,
  },
  tagline: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: spacing.xs,
  },

  // Body
  body: {
    paddingHorizontal: 28,
  },

  // Options Row
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  checkmark: {
    fontSize: 10,
    fontFamily: fonts.sansBold,
    marginTop: -1,
  },
  rememberText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
  },
  forgotText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
  },

  // Sign In Button
  signInButton: {
    marginTop: spacing.lg,
  },

  // Divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.xxl,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
  },

  // Social Buttons
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderWidth: 1,
  },
  socialIconWrap: {
    marginRight: spacing.sm,
  },
  socialButtonText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.md,
  },

  // Terms
  termsText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    textAlign: "center",
    marginTop: spacing.xl,
    lineHeight: 16,
  },
  termsLink: {
    textDecorationLine: "underline",
  },

  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: spacing.xxxl,
    paddingBottom: 40,
  },
  footerText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
  },
  footerLink: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.md,
  },
});
