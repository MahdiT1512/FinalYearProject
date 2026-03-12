import React, { useContext } from "react";
import { Pressable, Text, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { XPContext } from "../../context/XPContext";

type CardProps = {
  id: string;
  title: string;
  route: string;
  locked?: boolean;
};

export default function Card({ id, title, route, locked }: CardProps) {
  const router = useRouter();
  const { completedLessons } = useContext(XPContext);

  const completed = completedLessons.includes(id);

  const handlePress = () => {
    if (!locked) router.push(route);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        completed && styles.completedCard,
        locked && styles.lockedCard,
        pressed && !locked && styles.pressed,
      ]}
      disabled={locked}
      android_ripple={{ color: "#00000020" }}
    >
      <View style={styles.row}>
        <Text style={styles.title}>{title}</Text>

        {completed && <Text style={styles.icon}>✓</Text>}
        {locked && <Text style={styles.icon}>🔒</Text>}
      </View>

      <Text style={styles.status}>
        {completed ? "Completed" : locked ? "Locked" : "Tap to Start"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 6,
    backgroundColor: "#A0E7E5",
    borderRadius: 14,
    elevation: 3,
  },

  pressed: {
    transform: [{ scale: 0.97 }],
  },

  completedCard: {
    backgroundColor: "#7BCBC9",
  },

  lockedCard: {
    backgroundColor: "#ddd",
    opacity: 0.6,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
  },

  icon: {
    fontSize: 18,
    marginLeft: 10,
  },

  status: {
    marginTop: 6,
    fontSize: 13,
    color: "#333",
  },
});
