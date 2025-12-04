import React, { useContext, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { XPContext } from "../../context/XPContext";

type XPBarProps = {
  maxXP?: number;
};

export default function XPBar({ maxXP = 100 }: XPBarProps) {
  const { xp, level } = useContext(XPContext);
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: (xp / maxXP) * 100,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [xp, maxXP]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Level: {level} XP: {xp}
      </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", marginBottom: 15 },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 5 },
  barBackground: {
    height: 20,
    backgroundColor: "#e0e0e0",
    borderRadius: 10,
    overflow: "hidden",
  },
  barFill: { height: 20, backgroundColor: "#FFB703" },
});
