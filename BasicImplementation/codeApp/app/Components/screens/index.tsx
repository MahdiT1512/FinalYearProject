import { Text, View, FlatList, StyleSheet } from "react-native";
import React, { useContext } from "react";
import { XPContext } from "../../context/XPContext";
import { LinearGradient } from 'expo-linear-gradient';
import XPBar from "../common/XPBar";
import Card from "../common/LearnCard";

export default function LearnScreen() {
  
  const { xp, level, completedLessons } = useContext(XPContext);

  const lessons = ["Lesson 1", "Lesson 2", "Lesson 3"];

  return (
    <LinearGradient
      colors={["#A0E7E5", "#FFAEBC"]}
      style={{ flex: 1, padding: 10 }}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Learn Screen</Text>
        <XPBar />

        <FlatList
          data={lessons}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <Card
              title={item}
              route={`/learn/${item}`}
              />
            
          )}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: 10 },
  title: { fontSize: 24, fontWeight: 'bold', marginVertical: 10 },
  xpContainer: { width: '100%', marginBottom: 15, elevation: 5 },

  barBackground: {
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  barFill: {
    height: 20,
    backgroundColor: '#FFB703',
    elevation: 5,
  },
  card: {
    backgroundColor: "#A0E7E5",
    padding: 15,
    marginVertical: 5,
    borderRadius: 12,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  lesson: { fontSize: 18, marginBottom: 5 },
});