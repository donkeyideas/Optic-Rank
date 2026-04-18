import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { useAuth } from "../hooks/useAuth";
import { usePushRegistration } from "../hooks/usePushRegistration";
import { useAppFocusRefetch } from "../hooks/useAppFocusRefetch";
import AuthStack from "./AuthStack";
import AppStack from "./AppStack";
import SplashScreen from "../screens/SplashScreen";

export default function RootNavigator() {
  const { session, user, loading } = useAuth();

  // Register for push notifications when user is signed in
  usePushRegistration(user?.id);

  // Refetch all queries when app returns to foreground
  useAppFocusRefetch();

  if (loading) return <SplashScreen />;

  return (
    <NavigationContainer>
      {session ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
