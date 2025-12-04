import React, { useState, useContext } from "react";
import { View, Text, Button, FlatList, StyleSheet, Dimensions } from "react-native";
import { XPContext } from "../../context/XPContext";
import KeywordCard from "../common/KeywordCard";
type Keyword = { name: string; mastery: number };

export default function SyntaxScreen() {
  const { xp, addXP } = useContext(XPContext);
  const [keywords, setKeywords] = useState<Keyword[]>([
    { name: "def", mastery: 10 },
    { name: "print", mastery: 30 },
    { name: "int", mastery: 0 },
    { name: "str", mastery: 5 },
    { name: "if", mastery: 20 },
    { name: "else", mastery: 15 },
    { name: "for", mastery: 40 },
    { name: "while", mastery: 25 },
    { name: "return", mastery: 50 },
  ]);

  const numColumns = 2;
  const tileWidth = Dimensions.get("window").width / numColumns - 20;

  const practiceKeyword = (index: number) => {
    setKeywords(prev => {
      const newKeywords = [...prev];
      newKeywords[index].mastery = Math.min(newKeywords[index].mastery + 10, 100);
      addXP(5); 
      return newKeywords;
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Syntax</Text>
      <FlatList
        data={keywords}
        keyExtractor={(item) => item.name}
        numColumns={3}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <KeywordCard name={item.name} mastery={item.mastery} onPress={() => practiceKeyword(keywords.indexOf(item))}
            completed={item.mastery >= 100} />
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", padding: 10 },
  title: { fontSize: 24, fontWeight: "bold", marginVertical: 10 },
  card: { backgroundColor: "#F0F0F0", padding: 10, margin: 5, borderRadius: 10 },
  cardText: { textAlign: "center", marginBottom: 5 },
  barBackground: { height: 10, backgroundColor: "#e0e0e0", borderRadius: 5, overflow: "hidden", marginBottom: 5 },
  barFill: { height: 10, backgroundColor: "#FFB703" },
  row: {justifyContent: "space-between",}
});
