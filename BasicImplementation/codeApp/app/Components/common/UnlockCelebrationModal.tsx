import React, { useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export type UnlockCelebrationItem =
  | {
      type: "badge";
      id: string;
      name: string;
      description: string;
      icon: string;
      accent: string;
    }
  | {
      type: "title";
      title: string;
      accent?: string;
      icon?: string;
    }
  | {
      type: "avatar";
      name: string;
      description?: string;
      accent?: string;
      icon?: string;
    }
  | {
      type: "project";
      title: string;
      description?: string;
      accent?: string;
      icon?: string;
    }
  | {
      type: "achievement";
      title: string;
      description?: string;
      accent?: string;
      icon?: string;
    };

type Props = {
  visible: boolean;
  item: UnlockCelebrationItem | null;
  onClose: () => void;
};

//This component is used as an animated pop up for the user
// It takes what GlobalUnlockModal does and adds celebration animations to it.
export default function UnlockCelebrationModal({
  visible,
  item,
  onClose,
}: Props) {
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const sparkleA = useRef(new Animated.Value(0)).current;
  const sparkleB = useRef(new Animated.Value(0)).current;
  const sparkleC = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible || !item) return;

    scale.setValue(0.88);
    opacity.setValue(0);
    sparkleA.setValue(0);
    sparkleB.setValue(0);
    sparkleC.setValue(0);

    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(sparkleA, {
          toValue: 1,
          duration: 460,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(90),
        Animated.timing(sparkleB, {
          toValue: 1,
          duration: 460,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(170),
        Animated.timing(sparkleC, {
          toValue: 1,
          duration: 460,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [visible, item, opacity, scale, sparkleA, sparkleB, sparkleC]);

  if (!item) return null;

  let accent = "#6C63FF";
  let icon = "✨";
  let titleText = "Unlocked!";
  let mainText = "";
  let bodyText = "";

  switch (item.type) {
    case "badge":
      accent = item.accent;
      icon = item.icon;
      titleText = "Badge Unlocked!";
      mainText = item.name;
      bodyText = item.description;
      break;

    case "title":
      accent = item.accent ?? "#6C63FF";
      icon = item.icon ?? "👑";
      titleText = "New Title Unlocked!";
      mainText = item.title;
      bodyText = "You've unlocked a new title. Equip it from your profile.";
      break;

    case "avatar":
      accent = item.accent ?? "#06B6D4";
      icon = item.icon ?? "🎨";
      titleText = "New Avatar Unlocked!";
      mainText = item.name;
      bodyText =
        item.description ??
        "An avatar has been added to your collection. Check it out on your profile!";
      break;

    case "project":
      accent = item.accent ?? "#F59E0B";
      icon = item.icon ?? "🚀";
      titleText = "Project Unlocked!";
      mainText = item.title;
      bodyText =
        item.description ?? "A new project is now available for you to build.";
      break;

    case "achievement":
      accent = item.accent ?? "#10B981";
      icon = item.icon ?? "🏆";
      titleText = "Achievement Unlocked!";
      mainText = item.title;
      bodyText = item.description ?? "Keep it up! You've hit a new milestone.";
      break;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.cardWrap,
            {
              opacity,
              transform: [{ scale }],
            },
          ]}
        >
          <LinearGradient colors={["#FFFFFF", "#F8FAFF"]} style={styles.card}>
            <Animated.Text
              style={[
                styles.sparkle,
                styles.sparkleLeft,
                {
                  opacity: sparkleA,
                  transform: [
                    {
                      translateY: sparkleA.interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, -12],
                      }),
                    },
                  ],
                },
              ]}
            >
              ✨
            </Animated.Text>

            <Animated.Text
              style={[
                styles.sparkle,
                styles.sparkleRight,
                {
                  opacity: sparkleB,
                  transform: [
                    {
                      translateY: sparkleB.interpolate({
                        inputRange: [0, 1],
                        outputRange: [8, -14],
                      }),
                    },
                  ],
                },
              ]}
            >
              🎉
            </Animated.Text>

            <Animated.Text
              style={[
                styles.sparkle,
                styles.sparkleTop,
                {
                  opacity: sparkleC,
                  transform: [
                    {
                      translateY: sparkleC.interpolate({
                        inputRange: [0, 1],
                        outputRange: [6, -16],
                      }),
                    },
                  ],
                },
              ]}
            >
              ✨
            </Animated.Text>

            <View style={[styles.iconWrap, { backgroundColor: `${accent}22` }]}>
              <Text style={styles.iconText}>{icon}</Text>
            </View>

            <Text style={styles.heading}>{titleText}</Text>

            <View style={[styles.pill, { backgroundColor: accent }]}>
              <Text style={styles.pillText}>{item.type.toUpperCase()}</Text>
            </View>

            <Text style={styles.mainText}>{mainText}</Text>
            <Text style={styles.bodyText}>{bodyText}</Text>

            <View style={styles.buttonRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: accent },
                  pressed && styles.buttonPressed,
                ]}
                onPress={onClose}
              >
                <Text style={styles.primaryButtonText}>Nice</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  cardWrap: {
    width: "100%",
    maxWidth: 380,
  },

  card: {
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    position: "relative",
  },

  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  iconText: {
    fontSize: 36,
  },

  heading: {
    fontSize: 26,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },

  pill: {
    marginTop: 10,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  pillText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 0.6,
  },

  mainText: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },

  bodyText: {
    marginTop: 10,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "600",
  },

  buttonRow: {
    width: "100%",
    marginTop: 22,
  },

  primaryButton: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  primaryButtonText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },

  sparkle: {
    position: "absolute",
    fontSize: 26,
  },

  sparkleLeft: {
    left: 28,
    top: 30,
  },

  sparkleRight: {
    right: 28,
    top: 52,
  },

  sparkleTop: {
    top: 18,
  },

  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
});
