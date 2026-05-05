import React, { useContext, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { XPContext } from "../../context/XPContext";

type XPBarProps = {
  maxXP?: number;
  disableNavigation?: boolean;
};

//A progress bar component that can be clicked on to take the user to the progress screen.
//The component itself is also the progress bar, showing basic XP and level info
export default function XPBar({
  maxXP = 100,
  disableNavigation = false,
}: XPBarProps) {
  const router = useRouter();
  const { xp, level, allTimeXP } = useContext(XPContext);
  const animatedWidth = useRef(new Animated.Value(0)).current;

  const progress = Math.max(0, Math.min((xp / maxXP) * 100, 100));

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress,
      duration: 450,
      useNativeDriver: false,
    }).start();
  }, [progress, animatedWidth]);

  const content = (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.levelText}>Level {level}</Text>
          <Text style={styles.subText}>
            {xp}/{maxXP} XP to next level
          </Text>
        </View>

        <View style={styles.totalPill}>
          <Text style={styles.totalPillText}>{allTimeXP} total XP</Text>
        </View>
      </View>

      <View style={styles.barBackground}>
        <Animated.View
          style={[
            styles.barFill,
            {
              width: animatedWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>

      {!disableNavigation ? (
        <Text style={styles.tapHint}>
          Tap to view progress and todays goals
        </Text>
      ) : null}
    </View>
  );

  if (disableNavigation) {
    return content;
  }

  return (
    <Pressable
      onPress={() => router.push("/progress")}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },

  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.995 }],
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },

  levelText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
  },

  subText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "600",
  },

  totalPill: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  totalPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#4338CA",
  },

  barBackground: {
    height: 14,
    backgroundColor: "#E5E7EB",
    borderRadius: 999,
    overflow: "hidden",
  },

  barFill: {
    height: "100%",
    backgroundColor: "#FFB703",
    borderRadius: 999,
  },

  tapHint: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
  },
});
