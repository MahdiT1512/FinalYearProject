import React from "react";
import { View, Text, StyleSheet,Button } from "react-native";

type KeywordCardProps = {
  name: string;
  mastery: number; 
  onPress: () => void;
  completed?: boolean;  
};

export default function KeywordCard({ name, mastery, onPress, completed = false }: KeywordCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.keyword}>{name}</Text>
      <View style={styles.barBackground}>
        <View style={[styles.barFill, { width: `${mastery}%` }]} />
      </View>
      <Button
        title={completed ? "Mastered" : "Practice"}
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
    width: 120,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
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
});