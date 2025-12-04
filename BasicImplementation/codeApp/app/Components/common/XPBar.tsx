import React, { useContext } from "react";
import { View, Text, StyleSheet } from "react-native";
import { XPContext } from "../../context/XPContext";

type XPBarProps = {
  maxXP?: number;
};

export default function XPBar({ maxXP = 100 }: XPBarProps) {
  const { xp, level } = useContext(XPContext);
  const percent = Math.min((xp / maxXP) * 100, 100);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Level: {level} XP: {xp}</Text>
      <View style={styles.barBackground}>
        <View style={[styles.barFill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", marginBottom: 15 },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 5 },
  barBackground: { height: 20, backgroundColor: "#e0e0e0", borderRadius: 10, overflow: "hidden" },
  barFill: { height: 20, backgroundColor: "#FFB703" },
});