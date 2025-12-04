import React, { useContext } from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { XPContext } from "../../context/XPContext";

type CardProps = {
  title: string;
  route: string;
};

export default function Card({ title, route }: CardProps) {
  const router = useRouter();
  const { completedLessons } = useContext(XPContext);
  const completed = completedLessons.includes(title);

  return (
    <Pressable
      onPress={() => !completed && router.push(route)}
      style={({ pressed }) => [
        styles.card,
        completed && styles.completedCard,
        pressed && !completed && styles.pressed,
      ]}
      android_ripple={{ color: "#00000020" }}
      accessibilityRole="button"
      accessibilityState={{ disabled: completed }}
      disabled={completed}
    >
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.status}>{completed ? "Completed" : "Tap to Start"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    marginVertical: 6,
    marginHorizontal: 8,
    backgroundColor: "#A0E7E5",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 140,
  },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.95 },
  completedCard: { backgroundColor: "#7BCBC9", opacity: 0.7 },
  title: { fontSize: 16, fontWeight: "700", marginBottom: 6, textAlign: "center" },
  status: { fontSize: 13, color: "#333" },
});