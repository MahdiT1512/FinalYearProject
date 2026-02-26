import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Button, Animated } from "react-native";

type KeywordCardProps = {
  name: string;
  mastery: number; // 0–100
  onPress: () => void;
  completed?: boolean; // fully mastered
  xpPerExercise?: number;
  remainingExercises?: number;
};

export default function KeywordCard({
  name,
  mastery,
  onPress,
  completed = false,
  xpPerExercise = 10,
  remainingExercises = 1,
}: KeywordCardProps) {
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const [displayMastery, setDisplayMastery] = useState(mastery);

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: mastery,
      duration: 500,
      useNativeDriver: false,
    }).start();

    setDisplayMastery(mastery);
  }, [mastery]);

  return (
    <View style={[styles.card, completed && styles.completedCard]}>
      <Text style={styles.keyword}>{name}</Text>

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

      <Text style={styles.masteryText}>{displayMastery}% mastery</Text>
      <Text style={styles.xpText}>XP per exercise: {xpPerExercise}</Text>

      <Button
        title={
          completed
            ? "Mastered ✅"
            : `Practice${remainingExercises && remainingExercises > 1 ? ` (${remainingExercises} left)` : ""}`
        }
        onPress={onPress}
        disabled={completed}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFD6A5",
    padding: 10,
    margin: 5,
    borderRadius: 10,
    width: 130,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  completedCard: {
    opacity: 0.6,
  },
  keyword: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  barBackground: {
    height: 10,
    backgroundColor: "#e0e0e0",
    borderRadius: 5,
    width: "100%",
    overflow: "hidden",
    marginBottom: 5,
  },
  barFill: {
    height: "100%",
    backgroundColor: "#FFB703",
  },
  masteryText: {
    fontSize: 12,
    marginBottom: 2,
  },
  xpText: {
    fontSize: 12,
    marginBottom: 5,
    color: "#555",
  },
});
