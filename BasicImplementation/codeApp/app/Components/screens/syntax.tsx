// SyntaxScreen.tsx (under app/syntax or app/screens whichever you use for tabs)
import React, { useContext } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { XPContext } from "../../context/XPContext";
import { SyntaxContext } from "../../context/SyntaxContext";
import KeywordCard from "../../Components/common/KeywordCard";
import { useRouter } from "expo-router";

export default function SyntaxScreen() {
  const { xp } = useContext(XPContext);
  const { keywords } = useContext(SyntaxContext);
  const router = useRouter();

  const sortedKeywords = [...keywords].sort((a, b) => a.mastery - b.mastery);

  const handlePractice = (keywordId: string, exerciseIndex: number = 0) => {
    router.push({
      pathname: "/syntax/SyntaxPractice",
      params: { keywordId, exerciseIndex: exerciseIndex.toString() },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Syntax</Text>
      <Text style={styles.xp}>XP: {xp}</Text>
      <FlatList
        data={sortedKeywords}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <KeywordCard
            name={item.name}
            mastery={item.mastery}
            remainingExercises={item.remainingExercises}
            completed={item.mastery >= 100}
            onPress={() => handlePractice(item.id)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", padding: 10 },
  title: { fontSize: 24, fontWeight: "bold", marginVertical: 10 },
  xp: { fontSize: 16, marginBottom: 10 },
  row: { justifyContent: "space-between", width: "100%" },
});
