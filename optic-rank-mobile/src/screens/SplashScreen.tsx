import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { fonts, fontSize } from "../theme/typography";

export default function SplashScreen() {
  const translateX = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: 60,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -60,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [translateX]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo Mark */}
        <View style={styles.logoMark}>
          <Text style={styles.logoLetter}>O</Text>
        </View>

        {/* Logo Name */}
        <Text style={styles.logoName}>Optic Rank</Text>

        {/* Tagline */}
        <Text style={styles.tagline}>AI-Powered SEO Intelligence</Text>

        {/* Animated Loader Bar */}
        <View style={styles.loaderTrack}>
          <Animated.View
            style={[
              styles.loaderBar,
              { transform: [{ translateX }] },
            ]}
          />
        </View>

        {/* Status Text */}
        <Text style={styles.statusText}>LOADING YOUR INTELLIGENCE...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
  },
  logoMark: {
    width: 80,
    height: 80,
    borderWidth: 2,
    borderColor: "#f5f2ed",
    justifyContent: "center",
    alignItems: "center",
  },
  logoLetter: {
    fontFamily: fonts.serifBlack,
    fontSize: 48,
    color: "#f5f2ed",
  },
  logoName: {
    fontFamily: fonts.serif,
    fontSize: 20,
    color: "#f5f2ed",
    marginTop: 16,
  },
  tagline: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: "#999999",
    marginTop: 8,
  },
  loaderTrack: {
    width: 120,
    height: 2,
    backgroundColor: "#333333",
    marginTop: 32,
    overflow: "hidden",
  },
  loaderBar: {
    width: 40,
    height: 2,
    backgroundColor: "#c0392b",
    position: "absolute",
    left: 40,
  },
  statusText: {
    fontFamily: fonts.sans,
    fontSize: 10,
    letterSpacing: 1,
    color: "#777777",
    marginTop: 16,
    textTransform: "uppercase",
  },
});
